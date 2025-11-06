import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const GENRE_COLLECTION_NAME = 'genres'
const GENRE_COLLECTION_SCHEMA = Joi.object({
  // Tên thể loại (vd: "Hành động", "Kinh dị")
  name: Joi.string().required().min(3).max(50).trim().strict(),
  // Mô tả (không bắt buộc)
  description: Joi.string().optional().max(255).trim().strict().default(''),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

/**
 * 1. Thêm thể loại mới
 */
const createNew = async (data) => {
  const validData = await GENRE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(GENRE_COLLECTION_NAME).insertOne(validData)
}

/**
 * 2. Lấy chi tiết thể loại (phải chưa bị xoá)
 */
const findOneById = async (id) => {
  return await GET_DB().collection(GENRE_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

/**
 * Hàm nội bộ: Tìm theo tên (để check trùng)
 */
const findByName = async (name) => {
  return await GET_DB().collection(GENRE_COLLECTION_NAME).findOne({ name: name })
}

/**
 * 3. Sửa thể loại
 */
const update = async (id, data) => {
  // Loại bỏ các trường không được phép cập nhật
  delete data._id

  return await GET_DB().collection(GENRE_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false }, // Chỉ cập nhật cái chưa bị xoá
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' } // Trả về document sau khi update
  )
}

/**
 * 4. Xoá mềm thể loại
 */
const softDelete = async (id) => {
  return await GET_DB().collection(GENRE_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

/**
 * 5. Lấy danh sách (Tìm kiếm, Lọc, Phân trang)
 */
const getAll = async (filters = {}, pagination = {}) => {
  try {
    const { q } = filters // q = query search (lọc/tìm theo tên)
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false } // Luôn luôn lọc các cái chưa bị xoá

    // Tìm kiếm theo tên
    if (q) {
      query.name = { $regex: new RegExp(q, 'i') }
    }

    // 1. Truy vấn lấy tổng số document
    const totalGenres = await GET_DB().collection(GENRE_COLLECTION_NAME).countDocuments(query)

    // 2. Truy vấn lấy data (có phân trang)
    const genres = await GET_DB().collection(GENRE_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // 3. Trả về kết quả
    return {
      genres,
      pagination: {
        totalGenres,
        totalPages: Math.ceil(totalGenres / limit),
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

export const genreModel = {
  createNew,
  findOneById,
  findByName,
  update,
  softDelete,
  getAll
}