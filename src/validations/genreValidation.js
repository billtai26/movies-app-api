import Joi from 'joi'

/**
 * Validation cho tạo mới
 */
const createNew = async (req, res, next) => {
  const genreSchema = Joi.object({
    name: Joi.string().required().min(3).max(50).trim().strict(),
    description: Joi.string().optional().max(255).trim().strict().allow('')
  })

  try {
    await genreSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * Validation cho cập nhật
 */
const update = async (req, res, next) => {
  const genreSchema = Joi.object({
    name: Joi.string().min(3).max(50).trim().strict(),
    description: Joi.string().max(255).trim().strict().allow('')
  }).min(1) // Phải có ít nhất 1 trường để cập nhật

  try {
    await genreSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const genreValidation = {
  createNew,
  update
}
