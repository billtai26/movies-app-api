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

const findByCode = async (code) => {
  return await GET_DB().collection(VOUCHER_COLLECTION_NAME).findOne({
    code: code.toUpperCase(),
    isActive: true,
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

// (Thêm các hàm CRUD cho Admin nếu cần: createNew, update, delete...)

export const voucherModel = {
  findByCode,
  getActiveVouchers,
  incrementUsage
}
