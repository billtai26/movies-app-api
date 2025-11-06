import Joi from 'joi'

/**
 * 1. Validation cho Tạo mới (kiểm tra config tạo ghế)
 */
const createNew = async (req, res, next) => {
  const seatLayoutSchema = Joi.object({
    rows: Joi.array().items(Joi.string()).required().min(1), // ['A', 'B', 'C']
    seatsPerRow: Joi.number().integer().required().min(1), // 10
    vipRows: Joi.array().items(Joi.string()).optional(), // ['G', 'H']
    coupleRows: Joi.array().items(Joi.string()).optional() // ['K']
  })

  const hallSchema = Joi.object({
    name: Joi.string().required().min(3).max(50).trim().strict(),
    cinemaType: Joi.string().valid('2D', '3D', 'IMAX').required(),
    seatLayout: seatLayoutSchema.required()
  })

  try {
    await hallSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * 2. Validation cho Sửa phòng (chỉ sửa tên, loại)
 */
const updateHall = async (req, res, next) => {
  const hallSchema = Joi.object({
    name: Joi.string().min(3).max(50).trim().strict(),
    cinemaType: Joi.string().valid('2D', '3D', 'IMAX')
  }).min(1) // Ít nhất 1 trường

  try {
    await hallSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * 3. Validation cho Sửa 1 Ghế
 */
const updateSeat = async (req, res, next) => {
  const seatUpdateSchema = Joi.object({
    // Định danh ghế
    row: Joi.string().required(),
    number: Joi.number().integer().required(),
    // Dữ liệu cập nhật (ít nhất 1)
    status: Joi.string().valid('available', 'broken'),
    seatType: Joi.string().valid('standard', 'vip', 'couple')
  }).or('status', 'seatType') // Phải có status hoặc seatType

  try {
    await seatUpdateSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const cinemaHallValidation = {
  createNew,
  updateHall,
  updateSeat
}
