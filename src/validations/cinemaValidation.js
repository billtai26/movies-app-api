import Joi from 'joi'

const createNew = async (req, res, next) => {
  const cinemaSchema = Joi.object({
    name: Joi.string().required().min(3).max(100).trim().strict(),
    address: Joi.string().required().min(10).max(255).trim().strict(),
    city: Joi.string().required().min(3).max(50).trim().strict(),
    phone: Joi.string().optional().max(20).trim().strict().allow(''),
    logoUrl: Joi.string().optional().uri().trim().strict().allow('')
  })

  try {
    await cinemaSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

const update = async (req, res, next) => {
  const cinemaSchema = Joi.object({
    name: Joi.string().min(3).max(100).trim().strict(),
    address: Joi.string().min(10).max(255).trim().strict(),
    city: Joi.string().min(3).max(50).trim().strict(),
    phone: Joi.string().max(20).trim().strict().allow(''),
    logoUrl: Joi.string().uri().trim().strict().allow('')
  }).min(1)

  try {
    await cinemaSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const cinemaValidation = {
  createNew,
  update
}
