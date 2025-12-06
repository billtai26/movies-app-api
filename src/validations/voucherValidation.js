// src/validations/voucherValidation.js
import Joi from 'joi'

/**
 * (Admin) Validation khi tạo voucher
 */
const adminCreateNew = async (req, res, next) => {
  const condition = Joi.object({
    code: Joi.string().required().uppercase().trim().strict(),
    desc: Joi.string().allow(null, '').optional(), // Cho phép gửi mô tả
    title: Joi.string().allow(null, '').optional(), // Thêm luôn title nếu cần
    discountType: Joi.string().valid('fixed', 'percent').required(),
    discountValue: Joi.number().required().min(0),
    maxDiscountAmount: Joi.number().allow(null).when('discountType', {
      is: 'percent',
      then: Joi.number().min(0).required(),
      otherwise: Joi.optional()
    }),
    minOrderAmount: Joi.number().min(0).default(0),
    usageLimit: Joi.number().integer().min(1).required(),
    expiresAt: Joi.date().iso().required(), // Yêu cầu định dạng "2025-12-31T17:00:00Z"
    isActive: Joi.boolean().default(true)
  })
  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * (Admin) Validation khi cập nhật voucher
 */
const adminUpdate = async (req, res, next) => {
  const condition = Joi.object({
    // Cho phép sửa mọi thứ ngoại trừ 'code'
    desc: Joi.string().allow(null, '').optional(),
    title: Joi.string().allow(null, '').optional(),
    discountType: Joi.string().valid('fixed', 'percent'),
    discountValue: Joi.number().min(0),
    maxDiscountAmount: Joi.number().allow(null),
    minOrderAmount: Joi.number().min(0),
    usageLimit: Joi.number().integer().min(1),
    expiresAt: Joi.date().iso(),
    isActive: Joi.boolean()
  }).min(1) // Phải có ít nhất 1 trường

  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const voucherValidation = {
  adminCreateNew,
  adminUpdate
}
