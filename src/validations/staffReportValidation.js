import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    staff: Joi.string().required().min(3).trim().strict(),
    title: Joi.string().required().min(3).trim().strict(),
    message: Joi.string().required().min(3).trim().strict(),
    status: Joi.string().valid('Chưa duyệt', 'Đã duyệt', 'Từ chối').default('Chưa duyệt')
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const staffReportValidation = {
  createNew
}
