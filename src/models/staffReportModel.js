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
    const validData = await validateBeforeCreate(data)
    return await GET_DB().collection(STAFF_REPORT_COLLECTION_NAME).insertOne(validData)
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

export const staffReportModel = {
  STAFF_REPORT_COLLECTION_NAME,
  STAFF_REPORT_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  getAll,
  update,
  deleteItem
}
