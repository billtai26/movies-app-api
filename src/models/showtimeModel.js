import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const SHOWTIME_COLLECTION_NAME = 'showtimes'
const SHOWTIME_COLLECTION_SCHEMA = Joi.object({
  cinemaId: Joi.string().required(),
  movieId: Joi.string().required(), // Sẽ convert sang ObjectId
  theaterId: Joi.string().required(), // Sẽ convert sang ObjectId
  startTime: Joi.date().required(),

  // Mảng chứa toàn bộ ghế của suất chiếu này
  seats: Joi.array().items(Joi.object({
    seatNumber: Joi.string().required(), // Ví dụ: 'A1', 'A2', 'B1'
    status: Joi.string().valid('available', 'held', 'booked').required(),
    price: Joi.number().required(),
    type: Joi.string().valid('normal', 'vip', 'couple').default('normal'),
    heldBy: Joi.string().allow(null).default(null), // userId đang giữ ghế
    heldUntil: Joi.date().allow(null).default(null) // Thời gian ghế bị giữ đến khi hết hạn
  })).required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  // data nhận vào lúc này: { movieId: 'string', theaterId: 'string', startTime: DateObject ... }

  // 1. Validate (Joi sẽ validate string, date... và pass)
  const validData = await SHOWTIME_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })

  // 2. Tạo object để insert, convert ID tại đây
  const dataToInsert = {
    ...validData,
    cinemaId: new ObjectId(validData.cinemaId),
    movieId: new ObjectId(validData.movieId),
    theaterId: new ObjectId(validData.theaterId)
    // startTime đã là Date Object từ service, nên Joi(Joi.date()) vẫn chấp nhận
  }

  // 3. Insert object đã convert
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).insertOne(dataToInsert)
}

const findOneById = async (id) => {
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

/**
 * ====================================================================
 * ===== ĐÂY LÀ HÀM ĐƯỢC CHỈNH SỬA ĐỂ LỌC THEO MẢNG ID PHÒNG CHIẾU =====
 * ====================================================================
 */
/**
 * HÀM ĐÃ SỬA: Lấy danh sách kèm tên Phòng (lookup cinemahalls)
 */
const getAll = async ({ filters = {}, pagination = {} }) => {
  try {
    const { movieId, theaterIds, date } = filters
    // eslint-disable-next-line no-unused-vars
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    if (movieId) query.movieId = new ObjectId(movieId)

    // Logic lọc theo mảng theaterIds (nếu có)
    if (theaterIds && theaterIds.length > 0) {
      query.theaterId = { $in: theaterIds }
    }

    // Logic lọc theo ngày (nếu có)
    if (date) {
      const startDate = new Date(date + 'T00:00:00')
      const endDate = new Date(date + 'T23:59:59.999')
      query.startTime = { $gte: startDate, $lte: endDate }
    }

    // --- QUAN TRỌNG: Dùng Aggregate để lấy tên phòng ---
    const showtimes = await GET_DB().collection(SHOWTIME_COLLECTION_NAME).aggregate([
      { $match: query },

      // 1. Join với bảng 'cinemahalls' để lấy thông tin phòng chiếu từ 'theaterId'
      { $lookup: {
        from: 'cinemaHalls', // Tên collection phòng chiếu trong DB
        localField: 'theaterId', // Field trong showtime
        foreignField: '_id', // Field trong cinemahalls
        as: 'room' // Kết quả sẽ nằm trong field 'room'
      } },
      { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },

      // 2. (Tuỳ chọn) Join với bảng 'cinemas' để lấy tên rạp
      { $lookup: {
        from: 'cinemas',
        localField: 'cinemaId',
        foreignField: '_id',
        as: 'cinema'
      } },
      { $unwind: { path: '$cinema', preserveNullAndEmptyArrays: true } },

      { $sort: { startTime: 1 } }
      // { $skip: skip }, // Nếu cần phân trang thì mở lại
      // { $limit: limit }
    ]).toArray()

    // Trả về định dạng cũ để Frontend không bị lỗi
    return {
      showtimes, // Frontend đang đọc biến này
      pagination: {
        totalShowtimes: showtimes.length, // Tạm thời tính tổng theo mảng trả về
        totalPages: 1,
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

/**
 * HÀM MỚI: Sửa lịch chiếu (chỉ sửa startTime)
 */
const update = async (id, data) => {
  delete data._id // Không cho update _id

  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )
}

/**
 * HÀM MỚI: Xoá mềm lịch chiếu
 */
const softDelete = async (id) => {
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

// Hàm này rất quan trọng: Cập nhật nhiều ghế cùng lúc (Atomic)
const updateSeatsStatus = async (showtimeId, seatNumbers, newStatus, userId, heldUntil) => {
  const filter = { _id: new ObjectId(showtimeId) }

  const update = {
    $set: {
      'seats.$[elem].status': newStatus,
      'seats.$[elem].heldBy': userId,
      'seats.$[elem].heldUntil': heldUntil
    }
  }

  // TÙY CHỌN QUAN TRỌNG NHẤT: Thêm điều kiện status vào arrayFilters
  const options = {
    arrayFilters: [
      {
        'elem.seatNumber': { $in: seatNumbers }
      }
    ]
  }

  return await GET_DB()
    .collection(SHOWTIME_COLLECTION_NAME)
    .updateOne(filter, update, options)
}

// Trong showtimeModel
const rollbackSeatHold = async (showtimeId, seatNumbers, userId) => {
  const filter = {
    _id: new ObjectId(showtimeId)
  }

  const update = {
    $set: {
      'seats.$[elem].status': 'available',
      'seats.$[elem].heldBy': null,
      'seats.$[elem].heldUntil': null
    }
  }

  const options = {
    arrayFilters: [
      {
        'elem.seatNumber': { $in: seatNumbers },
        'elem.heldBy': userId
      }
    ]
  }

  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateOne(filter, update, options)
}

// HÀM MỚI: Mở lại ghế đã đặt (khi hủy vé)
const releaseBookedSeats = async (showtimeId, seatNumbers) => {
  const filter = {
    _id: new ObjectId(showtimeId)
  }

  const update = {
    $set: {
      'seats.$[elem].status': 'available', // Chuyển về 'available'
      'seats.$[elem].heldBy': null,
      'seats.$[elem].heldUntil': null
    }
  }

  const options = {
    arrayFilters: [
      {
        'elem.seatNumber': { $in: seatNumbers },
        'elem.status': 'booked' // Chỉ mở lại ghế đã 'booked'
      }
    ]
  }

  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateMany(filter, update, options)
}

// Thêm hoặc đảm bảo hàm này có export
const releaseSeats = async (showtimeId, seatNumbers, userId) => {
  const filter = { _id: new ObjectId(showtimeId) }
  const update = {
    $set: {
      'seats.$[elem].status': 'available',
      'seats.$[elem].heldBy': null,
      'seats.$[elem].heldUntil': null
    }
  }
  const options = {
    arrayFilters: [
      { 'elem.seatNumber': { $in: seatNumbers }, 'elem.heldBy': userId, 'elem.status': 'held' }
    ]
  }
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateOne(filter, update, options)
}

export const showtimeModel = {
  createNew,
  findOneById,
  getAll,
  update,
  softDelete,
  updateSeatsStatus,
  rollbackSeatHold,
  releaseBookedSeats,
  releaseSeats
}
