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
const getAll = async ({ filters = {}, pagination = {} }) => {
  try {
    // 1. Lấy ra theaterIds (mảng) thay vì theaterId (string)
    const { movieId, theaterIds, date } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    if (movieId) query.movieId = new ObjectId(movieId)

    // ---- LOGIC MỚI ĐỂ LỌC THEO MẢNG ID ----
    // Nếu service gửi lên một mảng các ID phòng chiếu (theaterIds)
    if (theaterIds && theaterIds.length > 0) {
      // Dùng $in để lọc tất cả suất chiếu có theaterId NẰM TRONG mảng này
      query.theaterId = { $in: theaterIds }
    }
    // ---- KẾT THÚC LOGIC MỚI ----

    // Lọc theo ngày (Rất quan trọng)
    if (date) {
      // Bắt đầu ngày (local): 2025-11-29 00:00:00 (Local)
      const startDate = new Date(date + 'T00:00:00')

      // Kết thúc ngày (local): 2025-11-29 23:59:59 (Local)
      const endDate = new Date(date + 'T23:59:59.999')

      query.startTime = {
        $gte: startDate,
        $lte: endDate
      }
    }

    // 1. Truy vấn lấy tổng số document
    const totalShowtimes = await GET_DB().collection(SHOWTIME_COLLECTION_NAME).countDocuments(query)

    // 2. Truy vấn lấy data (có phân trang)
    const showtimes = await GET_DB().collection(SHOWTIME_COLLECTION_NAME)
      .find(query)
      .sort({ startTime: 1 }) // Sắp xếp theo suất chiếu sớm nhất
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      showtimes,
      pagination: {
        totalShowtimes,
        totalPages: Math.ceil(totalShowtimes / limit),
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
  // Filter đơn giản hơn: chỉ cần tìm đúng document
  const filter = {
    _id: new ObjectId(showtimeId)
  }

  // Dữ liệu sẽ được cập nhật
  const arrayFilterUpdate = {
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
        'elem.seatNumber': { $in: seatNumbers },
        'elem.status': 'available' // <-- ĐÂY LÀ SỬA ĐỔI CỐT LÕI
      }
    ]
  }

  const result = await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateOne(filter, arrayFilterUpdate, options)
  return result
}

// Trong showtimeModel
const rollbackSeatHold = async (showtimeId, seatNumbers, userId) => {
  const filter = {
    _id: new ObjectId(showtimeId)
  }

  const update = {
    $set: {
      'seats.$[elem].status': 'available',
      'seats.$[Mym_elem].heldBy': null,
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
