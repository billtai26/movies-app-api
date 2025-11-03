import { bookingModel } from '~/models/bookingModel'
import { showtimeModel } from '~/models/showtimeModel'
import { userModel } from '~/models/userModel'
import { ObjectId } from 'mongodb'

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
    if (existingBooking.status !== 'completed') throw new Error('Booking is not completed.')
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

export const bookingService = {
  getBookingHistory,
  getTicketDetails,
  verifyAndUseTicket,
  cancelBooking
}
