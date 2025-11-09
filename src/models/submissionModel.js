import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

const SUBMISSION_COLLECTION_NAME = 'submissions'
const SUBMISSION_COLLECTION_SCHEMA = Joi.object({
  // Thông tin người gửi (bắt buộc, ngay cả khi đã đăng nhập)
  name: Joi.string().required().min(3).max(100).trim().strict(),
  email: Joi.string().required().email().trim().strict(),
  subject: Joi.string().required().min(5).max(256).trim().strict(),
  message: Joi.string().required().min(10).max(2000).trim().strict(),

  // Phân loại
  type: Joi.string().valid('contact', 'feedback', 'report').required(),

  // Trạng thái để Admin theo dõi
  status: Joi.string().valid('new', 'read', 'resolved').default('new'),

  // (Tùy chọn) Lưu lại ID user nếu họ đã đăng nhập
  userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

/**
 * Tạo mới
 */
const createNew = async (data) => {
  try {
    const validData = await SUBMISSION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
    const dataToInsert = {
      ...validData,
      userId: validData.userId ? new ObjectId(validData.userId) : null
    }
    return await GET_DB().collection(SUBMISSION_COLLECTION_NAME).insertOne(dataToInsert)
  } catch (error) { throw new Error(error) }
}

/**
 * Lấy danh sách (cho Admin - có phân trang, lọc)
 */
const getAll = async ({ status, type, page = 1, limit = 20 } = {}) => {
  try {
    let query = { _destroy: false }

    if (status) query.status = status
    if (type) query.type = type

    const pageNumber = Math.max(1, parseInt(page) || 1)
    const limitNumber = Math.max(1, parseInt(limit) || 20)
    const skip = (pageNumber - 1) * limitNumber

    const total = await GET_DB().collection(SUBMISSION_COLLECTION_NAME).countDocuments(query)

    const submissions = await GET_DB().collection(SUBMISSION_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 }) // Mới nhất lên đầu
      .skip(skip)
      .limit(limitNumber)
      .toArray()

    return {
      submissions,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber)
      }
    }
  } catch (error) { throw new Error(error) }
}

/**
 * Đánh dấu đã đọc/đã xử lý (cho Admin)
 */
const updateStatus = async (id, newStatus) => {
  try {
    return await GET_DB().collection(SUBMISSION_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: newStatus, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
  } catch (error) { throw new Error(error) }
}

/**
 * HÀM MỚI: Lấy chi tiết (cho Admin)
 */
const findOneById = async (id) => {
  return await GET_DB().collection(SUBMISSION_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

/**
 * HÀM MỚI: Xoá mềm (cho Admin)
 */
const softDelete = async (id) => {
  return await GET_DB().collection(SUBMISSION_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

export const submissionModel = {
  createNew,
  getAll,
  updateStatus,
  findOneById,
  softDelete
}
