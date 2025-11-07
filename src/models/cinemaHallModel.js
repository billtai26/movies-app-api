import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const CINEMA_HALL_COLLECTION_NAME = 'cinemaHalls'

// Định nghĩa 1 cái Ghế (Seat)
const SEAT_SCHEMA = Joi.object({
  row: Joi.string().required(), // 'A', 'B', 'C'
  number: Joi.number().required(), // 1, 2, 3
  seatType: Joi.string().valid('standard', 'vip', 'couple').required(),
  status: Joi.string().valid('available', 'booked', 'broken').default('available')
  // Không cần `_id` cho từng ghế nếu Joi không yêu cầu
})

// Định nghĩa Phòng chiếu (CinemaHall)
const CINEMA_HALL_COLLECTION_SCHEMA = Joi.object({
  // THÊM TRƯỜNG MỚI
  cinemaId: Joi.string().required(), // Sẽ convert sang ObjectId

  name: Joi.string().required().min(3).max(50).trim().strict(), // "Phòng 1", "IMAX"
  cinemaType: Joi.string().valid('2D', '3D', 'IMAX').required(),

  // Ghế được nhúng trực tiếp vào
  seats: Joi.array().items(SEAT_SCHEMA).required().min(1),
  totalSeats: Joi.number().integer().required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

/**
 * 1. Thêm phòng chiếu (đã bao gồm ghế)
 */
const createNew = async (data) => {
  const validData = await CINEMA_HALL_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })

  // Convert cinemaId trước khi insert
  const dataToInsert = {
    ...validData,
    cinemaId: new ObjectId(validData.cinemaId)
  }
  return await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).insertOne(dataToInsert)
}

/**
 * 2. Lấy chi tiết phòng (và toàn bộ ghế)
 */
const findOneById = async (id) => {
  return await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

/**
 * 3. Sửa phòng (chỉ thông tin chung)
 */
const update = async (id, data) => {
  delete data._id
  // Không cho phép sửa ghế bằng hàm này
  delete data.seats
  delete data.totalSeats

  return await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )
}

/**
 * 4. Sửa 1 Ghế Cụ Thể (ví dụ: báo hỏng)
 * Chúng ta dùng "arrayFilters" để tìm đúng ghế trong mảng
 */
const updateSeatStatus = async (hallId, row, number, newStatus, newType) => {
  const updateFields = {}
  if (newStatus) updateFields['seats.$[elem].status'] = newStatus
  if (newType) updateFields['seats.$[elem].seatType'] = newType

  return await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(hallId) },
    { $set: updateFields },
    {
      arrayFilters: [{ 'elem.row': row, 'elem.number': number }],
      returnDocument: 'after'
    }
  )
}

/**
 * 5. Xoá mềm phòng chiếu
 */
const softDelete = async (id) => {
  return await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

/**
 * 6. Lấy danh sách (Tìm kiếm, Lọc, Phân trang)
 */
const getAll = async (filters = {}, pagination = {}) => {
  try {
    const { q, cinemaType, cinemaId } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }
    if (q) query.name = { $regex: new RegExp(q, 'i') }
    if (cinemaType) query.cinemaType = cinemaType
    if (cinemaId) query.cinemaId = new ObjectId(cinemaId)

    const totalHalls = await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).countDocuments(query)
    const halls = await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME)
      .find(query)
      .project({ seats: 0 }) // Không trả về mảng ghế khi xem danh sách
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      halls,
      pagination: {
        totalHalls,
        totalPages: Math.ceil(totalHalls / limit),
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

// HÀM MỚI (Dùng cho cinemaService)
const findHallsByCinema = async (cinemaId) => {
  return await GET_DB().collection(CINEMA_HALL_COLLECTION_NAME).find({
    cinemaId: new ObjectId(cinemaId),
    _destroy: false
  }).toArray()
}

export const cinemaHallModel = {
  createNew,
  findOneById,
  update,
  updateSeatStatus,
  softDelete,
  getAll,
  findHallsByCinema
}
