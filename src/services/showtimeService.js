import { showtimeModel } from '~/models/showtimeModel'

const holdSeats = async (userId, showtimeId, seatNumbers) => {
  const HOLD_DURATION_MINUTES = 10
  const heldUntil = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)

  // Gọi hàm update trong model để đảm bảo atomic
  const result = await showtimeModel.updateSeatsStatus(
    showtimeId,
    seatNumbers,
    'held',
    userId,
    heldUntil
  )

  // Kiểm tra xem số lượng ghế được cập nhật có khớp với số lượng yêu cầu không
  if (result.modifiedCount !== seatNumbers.length) {
    // Có thể một hoặc vài ghế đã bị người khác giữ trước
    // Cần có logic để hoàn tác lại những ghế đã giữ thành công (nếu có)
    throw new Error('Some seats are not available. Please try again.')
  }

  return { message: 'Seats held successfully', heldUntil }
}

export const showtimeService = {
  holdSeats
}
