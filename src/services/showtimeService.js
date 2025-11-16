import { showtimeModel } from '~/models/showtimeModel'
import { cinemaHallModel } from '~/models/cinemaHallModel' // <-- Giữ nguyên import này
import { movieModel } from '~/models/movieModel'
import { ObjectId } from 'mongodb'

/**
 * HÀM MỚI: Thêm lịch chiếu (Admin)
 * * ====================================================================
 * ===== ĐÂY LÀ HÀM ĐƯỢC CHỈNH SỬA ĐỂ NHẬN VÀ LƯU cinemaId =====
 * ====================================================================
 */
const createNew = async (reqBody) => {
  try {
    // 1. Lấy cinemaId, movieId, theaterId... từ body
    const { cinemaId, movieId, theaterId, startTime, basePrice, vipPrice } = reqBody

    // 2. Lấy thông tin phòng chiếu (hall)
    const hall = await cinemaHallModel.findOneById(theaterId)
    if (!hall) throw new Error('Cinema hall (theater) not found')

    // 3. Lấy thông tin phim
    const movie = await movieModel.findOneById(movieId)
    if (!movie) throw new Error('Movie not found')

    // 4. --- LOGIC VALIDATION MỚI ---
    // Kiểm tra xem phòng chiếu (hall) có thuộc cụm rạp (cinema) không
    if (hall.cinemaId.toString() !== cinemaId) {
      throw new Error('This cinema hall does not belong to the specified cinema.')
    }
    // -----------------------------

    // 5. Logic "Biến đổi" ghế (giữ nguyên)
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

    // 6. Tạo object lịch chiếu mới (bao gồm cả cinemaId)
    const newShowtimeData = {
      // --- THÊM DÒNG NÀY ---
      cinemaId: cinemaId,
      // --------------------
      movieId: movieId,
      theaterId: theaterId,
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
 * (Hàm này đã được sửa ở bước trước để lọc theo cinemaId)
 */
const getShowtimes = async (queryParams) => {
  try {
    // Lấy thêm cinemaId từ query params
    const { movieId, theaterId, cinemaId, date, page, limit } = queryParams

    let theaterIdsToFilter = null // Biến này sẽ chứa mảng các ObjectId của phòng chiếu

    // ---- LOGIC MỚI ĐỂ LỌC THEO CỤM RẠP (CINEMA) ----
    // Ưu tiên 1: Lọc theo Cụm rạp (cinemaId)
    if (cinemaId) {
      // 1. Tìm tất cả các phòng chiếu (halls) thuộc cụm rạp này
      // (Hàm findHallsByCinema đã có sẵn trong cinemaHallModel)
      const halls = await cinemaHallModel.findHallsByCinema(cinemaId)

      // 2. Lấy ID của các phòng chiếu đó (dưới dạng mảng ObjectId)
      theaterIdsToFilter = halls.map(hall => hall._id)

      // 3. Nếu cụm rạp này không có phòng chiếu nào, ta trả về mảng rỗng
      if (theaterIdsToFilter.length === 0) {
        return {
          showtimes: [],
          pagination: { totalShowtimes: 0, totalPages: 0, currentPage: parseInt(page) || 1, limit: parseInt(limit) || 10 }
        }
      }
    }
    // Ưu tiên 2: Lọc theo Phòng chiếu (theaterId) - chỉ chạy nếu không có cinemaId
    else if (theaterId) {
      // Gói nó vào một mảng để Model xử lý đồng nhất
      theaterIdsToFilter = [new ObjectId(theaterId)]
    }
    // ---- KẾT THÚC LOGIC MỚI ----


    // Sửa filters: Bỏ theaterId, thay bằng theaterIds (là mảng các ObjectId)
    const filters = { movieId, date, theaterIds: theaterIdsToFilter }

    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 10
    const skip = (pageNum - 1) * limitNum
    const pagination = { page: pageNum, limit: limitNum, skip }

    // Gửi filters và pagination đã cập nhật xuống Model
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

export const showtimeService = {
  createNew,
  updateShowtime,
  deleteShowtime,
  getShowtimes,
  getShowtimeDetails,
  holdSeats
}
