import Joi from 'joi'

const register = async (req, res, next) => {
  const correctCondition = Joi.object({
    username: Joi.string().required().min(3).max(50).trim().strict(),
    email: Joi.string().required().email().trim().strict(),
    password: Joi.string().required().min(6).trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

const login = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().email().trim().strict(),
    password: Joi.string().required().min(6).trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const userValidation = {
  register,
  login
}