import Joi from 'joi'

const createSubmission = async (req, res, next) => {
  const correctCondition = Joi.object({
    name: Joi.string().required().min(3).max(100).trim().strict(),
    email: Joi.string().required().email().trim().strict(),
    subject: Joi.string().required().min(5).max(256).trim().strict(),
    message: Joi.string().required().min(10).max(2000).trim().strict(),
    type: Joi.string().valid('contact', 'feedback', 'report').required()
  })

  try {
    // Chỉ validate body, userId sẽ được lấy từ token (nếu có)
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const submissionValidation = {
  createSubmission
}
