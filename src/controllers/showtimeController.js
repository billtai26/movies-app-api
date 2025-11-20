import { showtimeService } from '~/services/showtimeService'

/**
 * HÀM MỚI: (Admin) Thêm lịch chiếu
 */
const createNew = async (req, res, next) => {
  try {
    const createdShowtime = await showtimeService.createNew(req.body)
    res.status(201).json(createdShowtime)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) Sửa lịch chiếu
 */
const updateShowtime = async (req, res, next) => {
  try {
    const showtimeId = req.params.id
    const updatedShowtime = await showtimeService.updateShowtime(showtimeId, req.body)
    res.status(200).json(updatedShowtime)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) Xoá lịch chiếu
 */
const deleteShowtime = async (req, res, next) => {
  try {
    const showtimeId = req.params.id
    const result = await showtimeService.deleteShowtime(showtimeId)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Public) Lấy danh sách, lọc
 */
const getShowtimes = async (req, res, next) => {
  try {
    const result = await showtimeService.getShowtimes(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

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

const releaseSeats = async (req, res, next) => {
  try {
    const showtimeId = req.params.id
    const seatNumbers = req.body.seatNumbers
    const userId = req.user._id // Lấy từ middleware protect

    await showtimeService.releaseSeats(userId.toString(), showtimeId, seatNumbers)

    res.status(200).json({ message: 'Released seats successfully' })
  } catch (error) {
    next(error)
  }
}

export const showtimeController = {
  createNew,
  updateShowtime,
  deleteShowtime,
  getShowtimes,
  getShowtimeDetails,
  holdSeats,
  releaseSeats
}