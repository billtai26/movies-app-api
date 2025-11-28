import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

/**
 * 1. Validation cho Tạo mới (kiểm tra config tạo ghế)
 */
const createNew = async (req, res, next) => {
  // Schema cho Config (Frontend gửi lên)
  const seatLayoutSchema = Joi.object({
    rows: Joi.array().items(Joi.string()).required(),
    seatsPerRow: Joi.number().integer().required().min(1),
    vipRows: Joi.array().items(Joi.string()).optional(),
    coupleRows: Joi.array().items(Joi.string()).optional()
  })

  const hallSchema = Joi.object({
    // Validation chỉ check những gì Frontend gửi thôi
    cinemaId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    name: Joi.string().required().min(3).max(50).trim().strict(),
    cinemaType: Joi.string().valid('2D', '3D', 'IMAX').required(),
    seatLayout: seatLayoutSchema.required()

    // ⚠️ QUAN TRỌNG:
    // Cho phép các trường khác đi qua (unknown: true)
    // hoặc KHÔNG validate mảng 'seats' ở đây vì Frontend ĐÂU CÓ GỬI 'seats'!
    // Frontend chỉ gửi 'seatLayout'.
  })

  try {
    // Thêm { allowUnknown: true } để Joi không báo lỗi các trường lạ
    await hallSchema.validateAsync(req.body, { abortEarly: false, allowUnknown: true })
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
    cinemaType: Joi.string().valid('2D', '3D', 'IMAX'),
    // 👉 THÊM: Cho phép cinemaId và seatLayout đi qua (để Service xử lý hoặc bỏ qua)
    cinemaId: Joi.string().optional(),
    seatLayout: Joi.object().unknown(true).optional()
  }).min(1) // Ít nhất 1 trường

  try {
    await hallSchema.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true
    })
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
