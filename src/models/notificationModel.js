import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

// Define Collection Name & Schema
const NOTIFICATION_COLLECTION_NAME = 'notifications'
const NOTIFICATION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

  // Phân loại: 'ticket' (vé), 'promotion' (khuyến mãi), 'new_movie' (phim mới), 'system' (hệ thống)
  type: Joi.string().valid('ticket', 'promotion', 'new_movie', 'system').required(),

  title: Joi.string().required().min(3).max(100).trim().strict(),
  message: Joi.string().required().min(3).max(500).trim().strict(),

  // (Tùy chọn) Đường link khi nhấp vào
  link: Joi.string().uri().allow(null, ''),

  isRead: Joi.boolean().default(false), // Đã đọc hay chưa

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  try {
    const validData = await NOTIFICATION_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
    const dataToInsert = {
      ...validData,
      userId: new ObjectId(validData.userId)
    }
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).insertOne(dataToInsert)
    return result
  } catch (error) { throw new Error(error) }
}

const findOneById = async (id) => {
  try {
    return await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: false
    })
  } catch (error) { throw new Error(error) }
}

/**
 * Lấy thông báo của user (có phân trang, sắp xếp mới nhất)
 */
const findByUserId = async (userId, page, limit) => {
  try {
    const query = { userId: new ObjectId(userId), _destroy: false }

    const pageNumber = Math.max(1, parseInt(page) || 1)
    const limitNumber = Math.max(1, parseInt(limit) || 10)
    const skip = (pageNumber - 1) * limitNumber

    const total = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).countDocuments(query)

    const notifications = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 }) // Tin mới nhất lên đầu
      .skip(skip)
      .limit(limitNumber)
      .toArray()

    return {
      notifications,
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
 * Đánh dấu đã đọc (bảo mật: chỉ user sở hữu mới được đánh dấu)
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const result = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(notificationId),
        userId: new ObjectId(userId) // Đảm bảo đúng user
      },
      {
        $set: { isRead: true }
      },
      {
        returnDocument: 'after'
      }
    )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách, lọc, phân trang
 */
const adminGetAll = async (filters = {}, pagination = {}) => {
  try {
    const { userId, type, isRead, q } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    // Lọc theo các trường
    if (userId) query.userId = new ObjectId(userId)
    if (type) query.type = type
    if (isRead !== undefined) query.isRead = (isRead === 'true')

    // Tìm kiếm (theo title hoặc message)
    if (q) {
      query.$or = [
        { title: { $regex: new RegExp(q, 'i') } },
        { message: { $regex: new RegExp(q, 'i') } }
      ]
    }
    
    const total = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).countDocuments(query)
    const notifications = await GET_DB().collection(NOTIFICATION_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()
    
    return {
      notifications,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

/**
 * HÀM MỚI: (Admin) Sửa thông báo
 */
const adminUpdate = async (id, data) => {
  delete data._id
  data.updatedAt = new Date()
  
  return await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: data },
    { returnDocument: 'after' }
  )
}

/**
 * HÀM MỚI: (Admin) Xoá mềm
 */
const adminSoftDelete = async (id) => {
  return await GET_DB().collection(NOTIFICATION_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true } }
  )
}

export const notificationModel = {
  createNew,
  findOneById,
  findByUserId,
  markAsRead,
  adminGetAll, // Mới
  adminUpdate, // Mới
  adminSoftDelete // Mới
}
