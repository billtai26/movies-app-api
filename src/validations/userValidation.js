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

// VALIDATION MỚI
const forgotPassword = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().required().email().trim().strict()
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

// VALIDATION MỚI
const resetPassword = async (req, res, next) => {
  const correctCondition = Joi.object({
    password: Joi.string().required().min(6).trim().strict()
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

// HÀM MỚI
const updateProfile = async (req, res, next) => {
  const correctCondition = Joi.object({
    username: Joi.string().min(3).max(50).trim().strict(),
    // Không cho phép sửa email, password, role... qua API này
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).trim().strict(),
    dob: Joi.date().iso(),
  })
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * HÀM MỚI: Validation cho Admin tạo user
 */
const adminCreateUser = async (req, res, next) => {
  const condition = Joi.object({
    username: Joi.string().required().min(3).max(50).trim().strict(),
    email: Joi.string().required().email().trim().strict(),
    password: Joi.string().required().min(6).trim().strict(),
    role: Joi.string().valid('user', 'admin').optional()
  })
  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * HÀM MỚI: Validation cho Admin cập nhật user
 */
const adminUpdateUser = async (req, res, next) => {
  const condition = Joi.object({
    // Admin có thể cập nhật các trường này
    username: Joi.string().min(3).max(50).trim().strict(),
    role: Joi.string().valid('user', 'admin'),
    loyaltyPoints: Joi.number().integer().min(0),
    isVerified: Joi.boolean()
    // Admin không được sửa email, pass qua API này
  }).min(1) // Phải có ít nhất 1 trường

  try {
    await condition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const userValidation = {
  register,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  adminCreateUser,
  adminUpdateUser
}