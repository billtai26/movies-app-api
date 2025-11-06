import { showtimeModel } from '~/models/showtimeModel'
import { cinemaHallModel } from '~/models/cinemaHallModel' // <-- Giả định bạn đã có
import { movieModel } from '~/models/movieModel' // <-- Giả định bạn đã có
import { ObjectId } from 'mongodb'

/**
 * HÀM MỚI: Thêm lịch chiếu (Admin)
 */
const createNew = async (reqBody) => {
  try {
    const { movieId, theaterId, startTime, basePrice, vipPrice } = reqBody

    // 1. Lấy thông tin phòng chiếu (để copy mảng ghế)
    const hall = await cinemaHallModel.findOneById(theaterId)
    if (!hall) throw new Error('Cinema hall not found')

    // 2. Lấy thông tin phim (để kiểm tra)
    const movie = await movieModel.findOneById(movieId)
    if (!movie) throw new Error('Movie not found')

    // 3. Logic "Biến đổi" ghế phòng chiếu -> ghế suất chiếu
    const showtimeSeats = hall.seats.map(seat => {
      let price = basePrice
      if (seat.seatType === 'vip') price = vipPrice
      if (seat.seatType === 'couple') price = basePrice * 2 // Ví dụ ghế đôi giá gấp 2

      return {
        seatNumber: `${seat.row}${seat.number}`, // Tạo định danh 'A1', 'A2'
        status: seat.status === 'broken' ? 'booked' : 'available', // Ghế hỏng sẽ không cho đặt
        price: price,
        heldBy: null,
        heldUntil: null
      }
    })

    // 4. Tạo object lịch chiếu mới
    const newShowtimeData = {
      movieId: movieId, // <-- Sửa: Gửi string
      theaterId: theaterId, // <-- Sửa: Gửi string
      startTime: new Date(startTime),
      seats: showtimeSeats,
      _destroy: false
    }

    const createdShowtime = await showtimeModel.createNew(newShowtimeData)
    return await showtimeModel.findOneById(createdShowtime.insertedId)

  } catch (error) { throw new Error(error.message) }
}

/**
 * HÀM MỚI: Sửa lịch chiếu (Admin)
 */
const updateShowtime = async (showtimeId, updateData) => {
  // Logic: Chỉ cho phép sửa startTime
  const dataToUpdate = {
    startTime: new Date(updateData.startTime)
  }
  const updatedShowtime = await showtimeModel.update(showtimeId, dataToUpdate)
  if (!updatedShowtime) {
    throw new Error('Showtime not found or update failed')
  }
  return updatedShowtime
}

/**
 * HÀM MỚI: Xoá lịch chiếu (Admin)
 */
const deleteShowtime = async (showtimeId) => {
  const showtime = await showtimeModel.findOneById(showtimeId)
  if (!showtime) throw new Error('Showtime not found')

  // QUAN TRỌNG: Kiểm tra xem đã có vé nào được BÁN chưa
  const hasBookedSeats = showtime.seats.some(seat => seat.status === 'booked')
  if (hasBookedSeats) {
    throw new Error('Cannot delete showtime with booked tickets. Please cancel bookings first.')
  }

  // (Nâng cao: Nếu có ghế 'held', nên rollback... Tạm thời cho xoá)
  await showtimeModel.softDelete(showtimeId)
  return { message: 'Showtime soft deleted successfully' }
}

/**
 * HÀM MỚI: Lấy danh sách (Lọc, Phân trang)
 */
const getShowtimes = async (queryParams) => {
  try {
    const { movieId, theaterId, date, page, limit } = queryParams
    const filters = { movieId, theaterId, date }

    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 10
    const skip = (pageNum - 1) * limitNum
    const pagination = { page: pageNum, limit: limitNum, skip }

    // SỬA LẠI DÒNG NÀY:
    // Bọc 'filters' và 'pagination' trong một dấu {}
    return await showtimeModel.getAll({ filters, pagination })

  } catch (error) { throw new Error(error) }
}

const holdSeats = async (userId, showtimeId, seatNumbers) => {
  const HOLD_DURATION_MINUTES = 10 // Thời gian giữ ghế
  const heldUntil = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)

  // Kiểm tra tính available của tất cả ghế trước
  const showtime = await showtimeModel.findOneById(showtimeId)
  const unavailableSeats = showtime.seats.filter(seat =>
    seatNumbers.includes(seat.seatNumber) && seat.status !== 'available'
  )

  if (unavailableSeats.length > 0) {
    throw new Error(`Seats ${unavailableSeats.map(s => s.seatNumber).join(', ')} are not available`)
  }

  // Thực hiện hold
  const result = await showtimeModel.updateSeatsStatus(
    showtimeId,
    seatNumbers,
    'held',
    userId,
    heldUntil
  )

  // CHỈ KIỂM TRA modifiedCount > 0, không so sánh với seatNumbers.length
  if (result.modifiedCount === 0) {
    throw new Error('Seat reservation failed due to concurrent booking. Please try again.')
  }

  // Kiểm tra lại xem tất cả ghế đã được hold thành công chưa
  const updatedShowtime = await showtimeModel.findOneById(showtimeId)
  const successfullyHeldSeats = updatedShowtime.seats.filter(seat =>
    seatNumbers.includes(seat.seatNumber) &&
    seat.status === 'held' &&
    seat.heldBy === userId
  )

  if (successfullyHeldSeats.length !== seatNumbers.length) {
    // Rollback nếu có ghế không được hold thành công
    await showtimeModel.rollbackSeatHold(showtimeId, seatNumbers, userId)
    throw new Error('Some seats could not be held. Please try again.')
  }

  return { message: 'Seats held successfully', heldUntil }
}

const getShowtimeDetails = async (showtimeId) => {
  const showtime = await showtimeModel.findOneById(showtimeId)
  if (!showtime) {
    throw new Error('Showtime not found')
  }
  return showtime
}

// DÒNG QUAN TRỌNG NHẤT LÀ ĐÂY
// Hãy chắc chắn rằng bạn export một đối tượng có tên là showtimeService
export const showtimeService = {
  createNew,
  updateShowtime,
  deleteShowtime,
  getShowtimes,
  getShowtimeDetails,
  holdSeats
}
