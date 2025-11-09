import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

/**
 * (Admin) Validation khi tạo thông báo thủ công
 */
const adminCreateNew = async (req, res, next) => {
  const condition = Joi.object({
    userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    type: Joi.string().valid('promotion', 'system').required(), // Admin chỉ nên gửi 2 loại này
    title: Joi.string().required().min(3).max(100).trim().strict(),
    message: Joi.string().required().min(3).max(500).trim().strict(),
    link: Joi.string().uri().allow(null, '').optional()
  })
  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * (Admin) Validation khi cập nhật thông báo
 */
const adminUpdate = async (req, res, next) => {
  const condition = Joi.object({
    title: Joi.string().min(3).max(100).trim().strict(),
    message: Joi.string().min(3).max(500).trim().strict(),
    link: Joi.string().uri().allow(null, ''),
    isRead: Joi.boolean() // Cho phép admin đánh dấu đã đọc
  }).min(1) // Phải có ít nhất 1 trường

  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const notificationValidation = {
  adminCreateNew,
  adminUpdate
}
