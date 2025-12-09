import Joi from 'joi'
// import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

/**
 * (Admin) Validation khi tạo thông báo thủ công
 */
const adminCreateNew = async (req, res, next) => {
  const condition = Joi.object({
    type: Joi.string().valid('ticket', 'promotion', 'new_movie', 'system').required(),
    title: Joi.string().required().min(3).max(100).trim().strict(),
    message: Joi.string().required().min(3).max(500).trim().strict(),
    link: Joi.string().uri().allow(null, '').optional(),

    // 1. Thêm validation cho target
    target: Joi.string().valid('all', 'user', 'staff').default('user'),

    // 2. XOÁ validation userId cũ đi (vì Frontend không gửi cái này nữa)
    // userId: Joi.string().required().pattern(OBJECT_ID_RULE)... <--- XOÁ DÒNG NÀY

    // 3. THAY THẾ bằng validation username
    username: Joi.string().trim().min(3).max(50)
      .when('target', {
        is: 'user',
        then: Joi.required().messages({
          'any.required': 'Vui lòng nhập Username người nhận khi chọn đối tượng là User'
        }),
        otherwise: Joi.optional().allow(null, '')
      })
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
