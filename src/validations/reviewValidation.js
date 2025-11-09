import Joi from 'joi'

/**
 * (Admin) Validation khi cập nhật review
 * Dùng cho Admin (họ có thể chỉ sửa comment hoặc chỉ sửa rating)
 */
const adminUpdate = async (req, res, next) => {
  const condition = Joi.object({
    // Cả 2 trường đều là tùy chọn
    rating: Joi.number().min(1).max(5),
    comment: Joi.string().trim().strict().max(1000).allow(null, '')
  }).min(1) // Nhưng phải có ít nhất 1 trường

  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * (User) Validation khi TẠO hoặc SỬA review
 * Dùng cho User
 */
const userCreateOrUpdate = async (req, res, next) => {
  const condition = Joi.object({
    // Khi user tự đánh giá, rating là BẮT BUỘC
    rating: Joi.number().required().min(1).max(5),
    // Comment là tùy chọn
    comment: Joi.string().trim().strict().max(1000).allow(null, '')
  })

  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const reviewValidation = {
  adminUpdate,
  userCreateOrUpdate // <-- Cung cấp hàm validation cho User
}
