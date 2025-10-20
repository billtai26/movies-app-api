import { showtimeService } from '~/services/showtimeService'

/**
 * Lấy thông tin chi tiết một suất chiếu, bao gồm cả sơ đồ ghế.
 */
const getShowtimeDetails = async (req, res, next) => {
  try {
    const showtimeId = req.params.id
    const showtime = await showtimeService.getShowtimeDetails(showtimeId)
    res.status(200).json(showtime)
  } catch (error) {
    next(error)
  }
}

/**
 * Xử lý yêu cầu giữ ghế từ người dùng đã đăng nhập.
 */
const holdSeats = async (req, res, next) => {
  try {
    const showtimeId = req.params.id
    const seatNumbers = req.body.seatNumbers
    const userId = req.user._id // Lấy userId từ middleware `protect`

    // Kiểm tra đầu vào cơ bản
    if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      // 400 Bad Request: Yêu cầu không hợp lệ
      return res.status(400).json({ errors: 'seatNumbers must be a non-empty array.' })
    }

    const result = await showtimeService.holdSeats(userId.toString(), showtimeId, seatNumbers)
    res.status(200).json(result)
  } catch (error) {
    // Chuyển lỗi cho middleware xử lý lỗi tập trung
    // Service có thể ném ra lỗi với thông điệp cụ thể (ví dụ: ghế đã bị giữ)
    next(error)
  }
}

export const showtimeController = {
  getShowtimeDetails,
  holdSeats
}