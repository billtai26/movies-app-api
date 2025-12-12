import { showtimeModel } from '~/models/showtimeModel'
import { cinemaHallModel } from '~/models/cinemaHallModel'
import { movieModel } from '~/models/movieModel'
import { ObjectId } from 'mongodb'

/**
 * HÀM MỚI: Thêm lịch chiếu (Admin)
 */
const createNew = async (reqBody) => {
  try {
    const { cinemaId, movieId, theaterId, startTime, basePrice, vipPrice } = reqBody

    // 1. Kiểm tra phòng chiếu
    const hall = await cinemaHallModel.findOneById(theaterId)
    if (!hall) throw new Error('Cinema hall (theater) not found')

    // 2. Kiểm tra phim
    const movie = await movieModel.findOneById(movieId)
    if (!movie) throw new Error('Movie not found')

    // 3. Validate logic
    if (hall.cinemaId.toString() !== cinemaId) {
      throw new Error('This cinema hall does not belong to the specified cinema.')
    }

    // 4. Tạo danh sách ghế cho suất chiếu
    const showtimeSeats = hall.seats.map(seat => {
      // Xác định loại ghế từ Hall (standard/vip/couple)
      const rawType = seat.seatType || 'standard'

      // --- FIX: Chuyển 'standard' thành 'normal' để khớp với Showtime & Frontend ---
      const type = rawType === 'standard' ? 'normal' : rawType
      // ---------------------------------------------------------------------------

      let price = basePrice
      if (type === 'vip') price = vipPrice
      if (type === 'couple') price = basePrice * 2

      return {
        seatNumber: `${seat.row}${seat.number}`,
        status: seat.status === 'broken' ? 'booked' : 'available',
        price: price,
        // Lưu loại ghế đã chuẩn hóa (normal/vip/couple)
        type: type,
        heldBy: null,
        heldUntil: null
      }
    })

    const newShowtimeData = {
      cinemaId: cinemaId,
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
  const showtime = await showtimeModel.findOneById(showtimeId)
  if (!showtime) throw new Error('Showtime not found')

  const dataToUpdate = {
    updatedAt: new Date()
  }

  if (updateData.startTime) {
    dataToUpdate.startTime = new Date(updateData.startTime)
  }

  // LOGIC CẬP NHẬT GIÁ VÉ & LOẠI GHẾ
  if (updateData.basePrice !== undefined || updateData.vipPrice !== undefined) {
    const hall = await cinemaHallModel.findOneById(showtime.theaterId)
    if (!hall) throw new Error('Cinema Hall not found to recalculate prices')

    // Tạo Map loại ghế từ Hall
    const seatTypeMap = {}
    hall.seats.forEach(s => {
      const key = `${s.row}${s.number}`
      seatTypeMap[key] = s.seatType || 'standard'
    })

    // Fallback giá cũ
    let currentBasePrice = 0
    let currentVipPrice = 0

    // Tìm mẫu giá cũ (dựa trên type đã lưu trong showtime: 'normal'/'vip')
    const sampleNormal = showtime.seats.find(s => s.type === 'normal')
    if (sampleNormal) currentBasePrice = sampleNormal.price

    const sampleVip = showtime.seats.find(s => s.type === 'vip')
    if (sampleVip) currentVipPrice = sampleVip.price

    const newBase = updateData.basePrice !== undefined ? Number(updateData.basePrice) : currentBasePrice
    const newVip = updateData.vipPrice !== undefined ? Number(updateData.vipPrice) : currentVipPrice

    const currentSeatsMap = {}
    showtime.seats.forEach(s => {
      currentSeatsMap[s.seatNumber] = s
    })

    const newSeats = hall.seats.map(seatProto => {
      const sn = `${seatProto.row}${seatProto.number}`
      const currentSeat = currentSeatsMap[sn]

      const rawType = seatProto.seatType || 'standard'
      // --- FIX: Chuyển 'standard' thành 'normal' ---
      const type = rawType === 'standard' ? 'normal' : rawType
      // -------------------------------------------

      let priceToSet = newBase
      if (type === 'vip') priceToSet = newVip
      if (type === 'couple') priceToSet = newBase * 2

      if (currentSeat) {
        if (currentSeat.status === 'booked') {
          return {
            ...currentSeat,
            type: type
          }
        }
        return {
          ...currentSeat,
          price: priceToSet,
          type: type
        }
      } else {
        return {
          seatNumber: sn,
          status: 'available',
          price: priceToSet,
          type: type,
          heldBy: null,
          heldUntil: null
        }
      }
    })

    dataToUpdate.seats = newSeats
  }

  return await showtimeModel.update(showtimeId, dataToUpdate)
}

/**
 * HÀM MỚI: Xoá lịch chiếu (Admin)
 */
const deleteShowtime = async (showtimeId) => {
  const showtime = await showtimeModel.findOneById(showtimeId)
  if (!showtime) throw new Error('Showtime not found')

  const hasBookedSeats = showtime.seats.some(seat => seat.status === 'booked')
  if (hasBookedSeats) {
    throw new Error('Cannot delete showtime with booked tickets. Please cancel bookings first.')
  }

  await showtimeModel.softDelete(showtimeId)
  return { message: 'Showtime soft deleted successfully' }
}

/**
 * HÀM MỚI: Lấy danh sách (Lọc, Phân trang)
 */
const getShowtimes = async (queryParams) => {
  try {
    const { movieId, theaterId, cinemaId, date, page, limit } = queryParams

    let theaterIdsToFilter = null

    if (cinemaId) {
      const halls = await cinemaHallModel.findHallsByCinema(cinemaId)
      theaterIdsToFilter = halls.map(hall => hall._id)

      if (theaterIdsToFilter.length === 0) {
        return {
          showtimes: [],
          pagination: { totalShowtimes: 0, totalPages: 0, currentPage: parseInt(page) || 1, limit: parseInt(limit) || 10 }
        }
      }
    }
    else if (theaterId) {
      theaterIdsToFilter = [new ObjectId(theaterId)]
    }

    const filters = { movieId, date, theaterIds: theaterIdsToFilter }

    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 10
    const skip = (pageNum - 1) * limitNum
    const pagination = { page: pageNum, limit: limitNum, skip }

    return await showtimeModel.getAll({ filters, pagination })

  } catch (error) { throw new Error(error) }
}

/**
 * Hàm giữ ghế (User)
 */
const holdSeats = async (userId, showtimeId, seatNumbers) => {
  const HOLD_DURATION_MINUTES = 7
  const heldUntil = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000)

  const showtime = await showtimeModel.findOneById(showtimeId)
  const unavailableSeats = showtime.seats.filter(seat =>
    seatNumbers.includes(seat.seatNumber) && seat.status !== 'available'
  )

  if (unavailableSeats.length > 0) {
    throw new Error(`Seats ${unavailableSeats.map(s => s.seatNumber).join(', ')} are not available`)
  }

  const result = await showtimeModel.updateSeatsStatus(
    showtimeId,
    seatNumbers,
    'held',
    userId,
    heldUntil
  )

  if (result.modifiedCount === 0) {
    throw new Error('Seat reservation failed due to concurrent booking. Please try again.')
  }

  const updatedShowtime = await showtimeModel.findOneById(showtimeId)
  const successfullyHeldSeats = updatedShowtime.seats.filter(seat =>
    seatNumbers.includes(seat.seatNumber) &&
    seat.status === 'held' &&
    seat.heldBy === userId
  )

  if (successfullyHeldSeats.length !== seatNumbers.length) {
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

const releaseSeats = async (userId, showtimeId, seatNumbers) => {
  const result = await showtimeModel.releaseSeats(showtimeId, seatNumbers, userId)
  return result
}

export const showtimeService = {
  createNew,
  updateShowtime,
  deleteShowtime,
  getShowtimes,
  getShowtimeDetails,
  holdSeats,
  releaseSeats
}
