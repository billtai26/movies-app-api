import { bookingModel } from '~/models/bookingModel'
import { showtimeModel } from '~/models/showtimeModel'
import { userModel } from '~/models/userModel'
import { movieModel } from '~/models/movieModel' // <-- IMPORT THÊM
import { notificationService } from '~/services/notificationService' // <-- IMPORT THÊM
import { env } from '~/config/environment' // <-- IMPORT THÊM
import { ObjectId } from 'mongodb'
import { ApiError } from '~/utils/ApiError'

// Định nghĩa số giờ tối thiểu trước suất chiếu để được hủy
const CANCELLATION_LIMIT_HOURS = 1

/**
 * Lấy lịch sử đặt vé của người dùng
 */
const getBookingHistory = async (userId) => {
  return await bookingModel.findByUserId(userId)
}

/**
 * Lấy chi tiết vé để in (cho API printTicket)
 */
const getTicketDetails = async (bookingId) => {
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) {
    throw new Error('Booking not found')
  }
  // (Bạn có thể populate thêm thông tin phim/rạp ở đây nếu muốn)
  return {
    bookingId: booking._id,
    userId: booking.userId,
    showtimeId: booking.showtimeId,
    movieId: booking.movieId,
    seats: booking.seats,
    totalAmount: booking.totalAmount,
    createdAt: booking.createdAt
  }
}

/**
 * Xác minh và đánh dấu vé đã sửdụng (cho API verify)
 */
const verifyAndUseTicket = async (bookingId) => {
  const updatedBooking = await bookingModel.markAsUsed(bookingId)

  if (!updatedBooking) {
    const existingBooking = await bookingModel.findOneById(bookingId)
    if (!existingBooking) throw new Error('Booking not found.')
    if (existingBooking.paymentStatus !== 'completed') throw new Error('Booking is not completed.')
    if (existingBooking.isUsed) throw new Error('Ticket has already been used.')
    throw new Error('Failed to mark ticket as used.')
  }
  return updatedBooking
}

/**
 * Xử lý hủy vé và hoàn điểm
 */
const cancelBooking = async (userId, bookingId) => {
  // 1. Tìm booking
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) {
    throw new Error('Booking not found')
  }

  // 2. Kiểm tra quyền sở hữu
  if (booking.userId.toString() !== userId.toString()) {
    throw new Error('Not authorized to cancel this booking')
  }

  // 3. Kiểm tra trạng thái
  if (booking.paymentStatus !== 'completed') {
    throw new Error('Cannot cancel a booking that is not completed')
  }
  if (booking.bookingStatus === 'cancelled') {
    throw new Error('Booking is already cancelled')
  }
  if (booking.isUsed) {
    throw new Error('Cannot cancel a ticket that has already been used')
  }

  // 4. Kiểm tra thời gian (Lấy suất chiếu)
  const showtime = await showtimeModel.findOneById(booking.showtimeId)
  if (!showtime) {
    throw new Error('Showtime details could not be found')
  }

  const now = new Date()
  const showStartTime = new Date(showtime.starttime)
  const hoursBeforeShow = (showStartTime.getTime() - now.getTime()) / 3600000 // mili-giây sang giờ

  if (hoursBeforeShow < CANCELLATION_LIMIT_HOURS) {
    throw new Error(`Tickets can only be cancelled up to ${CANCELLATION_LIMIT_HOURS} hours before the showtime`)
  }

  // 5. Xử lý hoàn điểm (nếu có)
  const pointsSpent = booking.pointsSpent || 0
  const pointsEarned = Math.floor(booking.totalAmount * 0.1) // Điểm đã được cộng
  const netPointChange = pointsSpent - pointsEarned // Hoàn lại điểm đã tiêu, thu hồi điểm đã cộng

  if (netPointChange !== 0) {
    await userModel.addLoyaltyPoints(userId, netPointChange)
  }

  // 6. Mở lại ghế trong showtimes
  // Chuyển đổi định dạng ghế: [{ row: 'B', number: 1 }] -> ['B1']
  const seatNumbers = booking.seats.map(seat => `${seat.row}${seat.number}`)
  await showtimeModel.releaseBookedSeats(booking.showtimeId, seatNumbers)

  // 7. Cập nhật trạng thái booking
  // Đặt bookingStatus='cancelled' và paymentStatus='awaiting_refund'
  // Admin sẽ dựa vào 'awaiting_refund' để xử lý hoàn tiền thủ công
  const updatedBooking = await bookingModel.update(bookingId, {
    bookingStatus: 'cancelled',
    paymentStatus: 'awaiting_refund', // Chuyển sang chờ hoàn tiền
    cancelledAt: new Date()
  })

  return {
    message: 'Booking cancelled successfully. Points adjusted. A refund request has been submitted to admin.',
    refundedPoints: pointsSpent,
    reclaimedPoints: pointsEarned,
    netPointChange: netPointChange,
    booking: updatedBooking
  }
}

/**
 * (Admin) Cập nhật thông tin booking
 */
const updateBooking = async (bookingId, updateData) => {
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) {
    throw new Error('Booking not found')
  }

  // Gọi hàm update chung đã có trong model
  const updatedBooking = await bookingModel.update(bookingId, updateData)
  return updatedBooking
}

/**
 * (User) Đổi vé (ngang giá)
 */
const exchangeTicket = async (userId, originalBookingId, newShowtimeId, newSeats) => {
  // 1. Tìm booking gốc
  const originalBooking = await bookingModel.findOneById(originalBookingId)
  if (!originalBooking) throw new Error('Original booking not found')

  // 2. Kiểm tra các điều kiện (tương tự như hủy vé)
  if (originalBooking.userId.toString() !== userId.toString()) {
    throw new Error('Not authorized to exchange this booking')
  }
  if (originalBooking.paymentStatus !== 'completed') {
    throw new Error('Cannot exchange a booking that is not completed')
  }
  if (originalBooking.bookingStatus === 'cancelled') {
    throw new Error('Cannot exchange a cancelled booking')
  }
  if (originalBooking.isUsed) {
    throw new Error('Cannot exchange a ticket that has already been used')
  }

  // 3. Kiểm tra thời gian (so với suất chiếu GỐC)
  const originalShowtime = await showtimeModel.findOneById(originalBooking.showtimeId)
  if (!originalShowtime) throw new Error('Original showtime details could not be found')

  const now = new Date()
  const originalStartTime = new Date(originalShowtime.starttime) // Sửa 'starttime' thành 'startTime'
  const hoursBeforeShow = (originalStartTime.getTime() - now.getTime()) / 3600000

  if (hoursBeforeShow < CANCELLATION_LIMIT_HOURS) {
    throw new Error(`Tickets can only be exchanged up to ${CANCELLATION_LIMIT_HOURS} hours before the original showtime`)
  }

  // 4. Kiểm tra suất chiếu mới và tính giá vé mới
  const newShowtime = await showtimeModel.findOneById(newShowtimeId)
  if (!newShowtime) throw new Error('New showtime not found')

  const newSeatNumbers = newSeats.map(s => `${s.row}${s.number}`)
  let newTotalAmount = 0

  // 5. Kiểm tra ghế mới có available không VÀ tính tổng tiền mới
  for (const newSeat of newSeats) {
    const seatInShowtime = newShowtime.seats.find(s => s.seatNumber === `${newSeat.row}${newSeat.number}`)
    if (!seatInShowtime || seatInShowtime.status !== 'available') {
      throw new Error(`Seat ${newSeat.row}${newSeat.number} is not available in the new showtime`)
    }
    // (Giả sử client gửi giá đúng, hoặc bạn có thể lấy giá từ seatInShowtime.price)
    newTotalAmount += newSeat.price
  }

  // 6. KIỂM TRA ĐIỀU KIỆN NGANG GIÁ (Rất quan trọng)
  // Chúng ta so sánh giá trị GỐC (originalAmount) của vé cũ
  if (newTotalAmount !== originalBooking.originalAmount) {
    throw new Error(`Ticket exchange must be of the same value. Original: ${originalBooking.originalAmount}, New: ${newTotalAmount}. Please cancel and re-book.`)
  }

  // 7. Thực hiện Đổi vé (Release + Book)
  // 7a. Mở lại ghế cũ
  const oldSeatNumbers = originalBooking.seats.map(seat => `${seat.row}${seat.number}`)
  await showtimeModel.releaseBookedSeats(originalBooking.showtimeId, oldSeatNumbers)

  // 7b. Đặt ghế mới (chuyển sang 'booked')
  await showtimeModel.updateSeatsStatus(
    newShowtimeId,
    newSeatNumbers,
    'booked',
    userId, // Gán 'booked' cho user
    null
  )

  // 7c. Cập nhật booking cũ
  const updatedBooking = await bookingModel.update(originalBookingId, {
    showtimeId: new ObjectId(newShowtimeId),
    movieId: new ObjectId(newShowtime.movieId),
    seats: newSeats,
    // Tất cả các trường khác (amount, points, voucher) giữ nguyên vì là đổi ngang giá
    updatedAt: new Date()
  })

  // 8. Gửi thông báo
  const movie = await movieModel.findOneById(updatedBooking.movieId)
  const link = `${env.APP_URL_FRONTEND || 'http://your-frontend-url.com'}/my-tickets/${updatedBooking._id}`
  await notificationService.createNotification(
    userId.toString(),
    'ticket',
    'Đổi vé thành công!',
    `Vé của bạn cho phim "${movie ? movie.title : ''}" đã được đổi thành công sang suất chiếu mới.`,
    link, true
  )

  return updatedBooking
}

/**
 * (Admin) Đổi ghế tại quầy (trong cùng 1 suất chiếu)
 */
const changeSeatsAtCounter = async (bookingId, oldSeats, newSeats) => {
  // 1. Tìm booking gốc
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) throw new Error('Booking not found')

  // Không cần check userId vì đây là Admin
  if (booking.bookingStatus === 'cancelled' || booking.isUsed) {
    throw new Error('Cannot change seats for a cancelled or used ticket')
  }

  // 2. Kiểm tra ghế cũ có khớp với booking không
  const oldSeatNumbersBooking = booking.seats.map(s => `${s.row}${s.number}`)
  const oldSeatNumbersInput = oldSeats.map(s => `${s.row}${s.number}`)

  if (oldSeatNumbersBooking.sort().join(',') !== oldSeatNumbersInput.sort().join(',')) {
    throw new Error('Danh sách ghế cũ không khớp với vé.')
  }

  // 3. Lấy showtime (chỉ 1 lần vì chung suất chiếu)
  const showtime = await showtimeModel.findOneById(booking.showtimeId)
  if (!showtime) throw new Error('Showtime not found')

  const newSeatNumbers = newSeats.map(s => `${s.row}${s.number}`)
  let newTotalAmount = 0

  // 4. Kiểm tra ghế mới có available không
  for (const newSeat of newSeats) {
    const seatInShowtime = showtime.seats.find(s => s.seatNumber === `${newSeat.row}${newSeat.number}`)
    if (!seatInShowtime || seatInShowtime.status !== 'available') {
      throw new Error(`Seat ${newSeat.row}${newSeat.number} is not available`)
    }
    newTotalAmount += newSeat.price
  }

  // (Optional: Bạn có thể bỏ qua check giá nếu admin đổi ngang)
  // if (newTotalAmount !== booking.totalAmount) {
  //   throw new Error('Giá vé mới không bằng giá vé cũ. Vui lòng hủy và đặt lại.')
  // }
  // Hoặc cập nhật lại tổng tiền nếu cho phép
  const newOriginalAmount = newSeats.reduce((acc, seat) => acc + seat.price, 0)


  // ----- BẮT ĐẦU TRANSACTION (Nếu bạn dùng Replica Set) -----
  // const session = await mongoose.startSession()
  // session.startTransaction()
  // try {

  // 5. Mở lại ghế cũ
  await showtimeModel.releaseBookedSeats(booking.showtimeId, oldSeatNumbersBooking /*, { session }*/)

  // 6. Đặt ghế mới
  await showtimeModel.updateSeatsStatus(
    booking.showtimeId,
    newSeatNumbers,
    'booked',
    booking.userId // Vẫn gán cho user
    /*, { session }*/
  )

  // 7. Cập nhật lại booking
  const updatedBooking = await bookingModel.update(bookingId, {
    seats: newSeats,
    totalAmount: newTotalAmount, // Cập nhật tổng tiền mới
    originalAmount: newOriginalAmount, // Cập nhật giá gốc mới
    updatedAt: new Date()
  } /*, { session }*/)

  // await session.commitTransaction()
  // session.endSession()

  return updatedBooking

  // } catch (error) {
  //   await session.abortTransaction()
  //   session.endSession()
  //   throw error // Ném lỗi để controller bắt
  // }
  // ----- KẾT THÚC TRANSACTION -----
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách (Lọc, Phân trang)
 */
const adminGetBookings = async (queryParams) => {
  const { userId, movieId, date, paymentStatus, bookingStatus, page, limit } = queryParams

  const filters = {
    userId,
    movieId,
    createdAtDate: date, // Đổi 'date' thành 'createdAtDate' cho model
    paymentStatus,
    bookingStatus
  }

  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 10
  const skip = (pageNum - 1) * limitNum
  const pagination = { page: pageNum, limit: limitNum, skip }

  return await bookingModel.getAll(filters, pagination)
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết 1 vé/hoá đơn
 */
const adminGetBookingDetails = async (bookingId) => {
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) {
    throw new ApiError(404, 'Booking not found')
  }

  // Làm giàu dữ liệu (Populate)
  const user = await userModel.findOneById(booking.userId)
  const movie = await movieModel.findOneById(booking.movieId)
  const showtime = await showtimeModel.findOneById(booking.showtimeId) // (Đảm bảo showtimeModel có findOneById)

  return {
    ...booking,
    userDetails: { email: user?.email, name: user?.name }, // Chỉ trả về thông tin an toàn
    movieTitle: movie?.title,
    showtimeDetails: { startTime: showtime?.startTime }
  }
}

/**
 * HÀM MỚI: (Admin) Xoá mềm 1 vé
 */
const adminDeleteBooking = async (bookingId) => {
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) {
    throw new ApiError(404, 'Booking not found')
  }

  // Logic nghiệp vụ: Chỉ xoá mềm, không hoàn vé/hoàn điểm/trả ghế
  // (Nếu muốn, bạn có thể gọi logic `cancelBooking` ở đây,
  // nhưng "soft delete" thường chỉ là ẩn đi)

  await bookingModel.softDelete(bookingId)
  return { message: 'Booking soft deleted successfully' }
}

/**
 * HÀM MỚI: (Admin) Thêm combo tại quầy
 */
const addCombosAtCounter = async (bookingId, newCombos) => {
  // 1. Kiểm tra booking
  const booking = await bookingModel.findOneById(bookingId)
  if (!booking) {
    throw new ApiError(404, 'Booking not found')
  }
  if (booking.bookingStatus === 'cancelled') {
    throw new ApiError(400, 'Cannot add combos to a cancelled booking')
  }

  // 2. Tính toán tổng tiền được thêm vào (Giả sử 'price' là tổng giá)
  // Nếu 'price' là đơn giá, bạn cần nhân với quantity
  const addedAmount = newCombos.reduce((acc, combo) => {
    // Giả định 'price' là TỔNG GIÁ của số lượng combo đó
    return acc + combo.price
    // Hoặc nếu 'price' là ĐƠN GIÁ:
    // return acc + (combo.price * combo.quantity)
  }, 0)

  // 3. Gọi model để cập nhật (atomic update)
  const updatedBooking = await bookingModel.addCombosAndUpdateAmount(
    bookingId,
    newCombos,
    addedAmount
  )

  if (!updatedBooking) {
    throw new ApiError(500, 'Failed to add combos to booking')
  }

  // (Logic nghiệp vụ: Giả định nhân viên đã nhận tiền mặt cho 'addedAmount')
  return updatedBooking
}

export const bookingService = {
  getBookingHistory,
  getTicketDetails,
  verifyAndUseTicket,
  cancelBooking,
  updateBooking,
  exchangeTicket,
  changeSeatsAtCounter,
  adminGetBookings,
  adminGetBookingDetails,
  adminDeleteBooking,
  addCombosAtCounter
}
