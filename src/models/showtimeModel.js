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
  // Điều kiện để tìm đúng các ghế cần cập nhật
  const filter = {
    _id: new ObjectId(showtimeId),
    'seats.seatNumber': { $in: seatNumbers },
    'seats.status': 'available' // Chỉ được giữ ghế đang 'available'
  }

  // updateMany không trả về document, chúng ta cần kiểm tra matchedCount
  // Lưu ý: 'seats.$' chỉ cập nhật phần tử ĐẦU TIÊN khớp.
  // Để cập nhật nhiều ghế, cần dùng arrayFilters.
  const arrayFilterUpdate = {
    $set: {
      'seats.$[elem].status': newStatus,
      'seats.$[elem].heldBy': userId,
      'seats.$[elem].heldUntil': heldUntil
    }
  }
  const options = {
    arrayFilters: [{ 'elem.seatNumber': { $in: seatNumbers } }]
  }

  const result = await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateOne(filter, arrayFilterUpdate, options)
  return result
}


export const showtimeModel = {
  createNew,
  findOneById,
  getAll,
  updateSeatsStatus
}
