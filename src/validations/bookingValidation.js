import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

/**
 * Validation cho Admin cập nhật một booking
 */
const updateBooking = async (req, res, next) => {
  const correctCondition = Joi.object({
    // Cho phép Admin thay đổi các trường trạng thái này
    paymentStatus: Joi.string().valid('pending', 'completed', 'failed'),
    bookingStatus: Joi.string().valid('active', 'cancelled'),
    isUsed: Joi.boolean()

    // Không cho phép sửa seats, amount, userId, movieId qua API này
    // vì nó có thể phá vỡ logic đồng bộ (ví dụ: ghế trong showtimes)
  }).min(1) // Yêu cầu ít nhất một trường để cập nhật

  try {
    // Chỉ validate body
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * Validation cho User đổi vé
 */
const exchangeTicket = async (req, res, next) => {
  const correctCondition = Joi.object({
    newShowtimeId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    newSeats: Joi.array().items(
      Joi.object({
        row: Joi.string().required(),
        number: Joi.number().required(),
        price: Joi.number().required()
      })
    ).required().min(1) // Phải chọn ít nhất 1 ghế mới
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const bookingValidation = {
  updateBooking,
  exchangeTicket
}
