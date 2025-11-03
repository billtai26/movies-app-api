import { showtimeModel } from '~/models/showtimeModel'

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
  getShowtimeDetails,
  holdSeats
}
