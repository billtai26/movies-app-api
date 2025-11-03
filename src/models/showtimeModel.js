import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const SHOWTIME_COLLECTION_NAME = 'showtimes'
const SHOWTIME_COLLECTION_SCHEMA = Joi.object({
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
  const validData = await SHOWTIME_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
}

const getAll = async ({ status }) => {
  let query = { _destroy: false }
  if (status) {
    query.status = status
  }
  return await GET_DB().collection(SHOWTIME_COLLECTION_NAME).find(query).toArray()
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

export const showtimeModel = {
  createNew,
  findOneById,
  getAll,
  updateSeatsStatus,
  rollbackSeatHold,
  releaseBookedSeats
}
