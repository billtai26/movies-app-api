import Joi from 'joi'

// Validation cho lúc tạo mới
const createNew = async (req, res, next) => {
  const movieSchema = Joi.object({
    title: Joi.string().required().min(3).max(100).trim().strict(),
    description: Joi.string().required().min(10).trim().strict(),
    director: Joi.string().required().min(3).max(50).trim().strict(),
    releaseDate: Joi.date().required(),
    durationInMinutes: Joi.number().required().integer().min(30),
    genres: Joi.array().items(Joi.string()).required().min(1),
    posterUrl: Joi.string().required().uri().trim().strict(),
    trailerUrl: Joi.string().required().uri().trim().strict(),
    status: Joi.string().valid('now_showing', 'coming_soon').required()
    // Không cần validate rating, count vì đã có default
  })

  try {
    await movieSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

// Validation cho lúc cập nhật
const update = async (req, res, next) => {
  const movieSchema = Joi.object({
    // Cho phép cập nhật các trường này
    title: Joi.string().min(3).max(100).trim().strict(),
    description: Joi.string().min(10).trim().strict(),
    director: Joi.string().min(3).max(50).trim().strict(),
    releaseDate: Joi.date(),
    durationInMinutes: Joi.number().integer().min(30),
    genres: Joi.array().items(Joi.string()).min(1),
    posterUrl: Joi.string().uri().trim().strict(),
    trailerUrl: Joi.string().uri().trim().strict(),
    status: Joi.string().valid('now_showing', 'coming_soon')

    // Không cho phép cập nhật rating qua API này
  }).min(1) // Yêu cầu ít nhất 1 trường để cập nhật

  try {
    await movieSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const movieValidation = {
  createNew,
  update
}