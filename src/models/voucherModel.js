import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const VOUCHER_COLLECTION_NAME = 'vouchers'
const VOUCHER_COLLECTION_SCHEMA = Joi.object({
  code: Joi.string().required().uppercase().trim().strict(),
  discountType: Joi.string().valid('fixed', 'percent').required(), // 'fixed': giảm thẳng tiền, 'percent': giảm %
  discountValue: Joi.number().required().min(0),
  maxDiscountAmount: Joi.number().allow(null), // Giới hạn giảm tối đa (cho 'percent')
  minOrderAmount: Joi.number().min(0).default(0), // Đơn hàng tối thiểu
  usageLimit: Joi.number().integer().min(1).required(), // Tổng số lượt dùng
  usageCount: Joi.number().integer().default(0), // Số lượt đã dùng
  expiresAt: Joi.date().required(), // Ngày hết hạn
  isActive: Joi.boolean().default(true),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

/**
 * HÀM MỚI: (Admin) Tạo mới
 */
const createNew = async (data) => {
  const validData = await VOUCHER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).insertOne(validData)
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết
 */
const findOneById = async (id) => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

/**
 * (User) Tìm voucher còn hạn
 */
const findByCode = async (code) => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).findOne({
    code: code.toUpperCase(),
    isActive: true,
    _destroy: false,
    expiresAt: { $gt: new Date() } // <-- Thêm check hết hạn
  })
}

/**
 * HÀM MỚI: (Admin) Check trùng code, kể cả code inactive
 */
const adminFindByCode = async (code) => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).findOne({
    code: code.toUpperCase(),
    _destroy: false
  })
}

const getActiveVouchers = async () => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).find({
    isActive: true,
    _destroy: false,
    expiresAt: { $gt: new Date() }
  }).toArray()
}

// Tăng số lượt đã sử dụng (atomic)
const incrementUsage = async (voucherId) => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(voucherId) },
    { $inc: { usageCount: 1 } }
  )
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách, lọc, phân trang
 */
const adminGetAll = async (filters = {}, pagination = {}) => {
  try {
    const { q, isActive } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    // Lọc theo trạng thái (active/inactive)
    if (isActive !== undefined) query.isActive = (isActive === 'true')

    // Tìm kiếm (theo code)
    if (q) {
      query.code = { $regex: new RegExp(q, 'i') }
    }

    const total = await GET_DB().collection(VOUCHER_COLLECTION_NAME).countDocuments(query)
    const vouchers = await GET_DB().collection(VOUCHER_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      vouchers,
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
 * HÀM MỚI: (Admin) Sửa
 */
const adminUpdate = async (id, data) => {
  delete data._id
  data.updatedAt = new Date()

  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: data },
    { returnDocument: 'after' }
  )
}

/**
 * HÀM MỚI: (Admin) Xoá mềm
 */
const adminSoftDelete = async (id) => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true } }
  )
}

export const voucherModel = {
  // User
  findByCode,
  getActiveVouchers,
  incrementUsage,
  // Admin
  createNew,
  findOneById,
  adminFindByCode,
  adminGetAll,
  adminUpdate,
  adminSoftDelete
}
