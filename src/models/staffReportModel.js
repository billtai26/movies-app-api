import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

// Định nghĩa Collection Name
const STAFF_REPORT_COLLECTION_NAME = 'staff_reports'

// Định nghĩa Schema (Khuôn mẫu dữ liệu)
const STAFF_REPORT_COLLECTION_SCHEMA = Joi.object({
  staff: Joi.string().required().min(3).trim().strict(),
  message: Joi.string().required().min(3).trim().strict(),
  status: Joi.string().valid('Chưa duyệt', 'Đã duyệt', 'Từ chối').default('Chưa duyệt'),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null)
})

const validateBeforeCreate = async (data) => {
  return await STAFF_REPORT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}


const createNew = async (data) => {
  try {
    const validData = await REPORT_SCHEMA.validateAsync(data, { abortEarly: false })
    return await GET_DB().collection(REPORT_COLLECTION_NAME).insertOne(validData)
  } catch (error) { throw new Error(error) }
}

const findOneById = async (id) => {
  try {
    return await GET_DB().collection(STAFF_REPORT_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
  } catch (error) { throw new Error(error) }
}

const getAll = async () => {
  try {
    // Trả về mảng dữ liệu, sắp xếp mới nhất lên đầu
    return await GET_DB().collection(STAFF_REPORT_COLLECTION_NAME).find({}).sort({ createdAt: -1 }).toArray()
  } catch (error) { throw new Error(error) }
}

const update = async (id, data) => {
  try {
    const updateData = { ...data, updatedAt: Date.now() }
    // Xóa trường _id nếu có để tránh lỗi immutable
    delete updateData._id

    return await GET_DB().collection(STAFF_REPORT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
  } catch (error) { throw new Error(error) }
}

const deleteItem = async (id) => {
  try {
    return await GET_DB().collection(STAFF_REPORT_COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) })
  } catch (error) { throw new Error(error) }
}

const BOOKING_COLLECTION_NAME = 'bookings'
const getRevenueStats = async (startDate, endDate) => {
  try {
    const results = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          _destroy: false,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalTickets: { $sum: { $size: '$seats' } },
          totalBookings: { $sum: 1 }
        }
      },
      { $project: { _id: 0, totalRevenue: 1, totalTickets: 1, totalBookings: 1 } }
    ]).toArray()
    return results[0] || { totalRevenue: 0, totalTickets: 0, totalBookings: 0 }
  } catch (error) { throw new Error(error) }
}

// --- PHẦN 2: BÁO CÁO SỰ CỐ (Thêm mới) ---
const REPORT_COLLECTION_NAME = 'staff_reports'
const REPORT_SCHEMA = Joi.object({
  staff: Joi.string().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  status: Joi.string().valid('Chưa duyệt', 'Đã duyệt', 'Từ chối').default('Chưa duyệt'),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})

const getAllReports = async () => {
  try {
    return await GET_DB().collection(REPORT_COLLECTION_NAME)
      .find({ _destroy: false })
      .sort({ createdAt: -1 })
      .toArray()
  } catch (error) { throw new Error(error) }
}

export const staffReportModel = {
  STAFF_REPORT_COLLECTION_NAME,
  STAFF_REPORT_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  getAll,
  update,
  deleteItem,
  getRevenueStats,
  getAllReports,
  validateBeforeCreate
}
