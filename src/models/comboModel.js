import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const COMBO_COLLECTION_NAME = 'fooddrinks'
const COMBO_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(3).max(100).trim().strict(),
  description: Joi.string().required().min(3).max(256).trim().strict(),
  price: Joi.number().required().integer().min(0),
  imageUrl: Joi.string().required().uri().trim().strict(),

  // 'active': Đang bán, 'inactive': Ngừng bán
  status: Joi.string().valid('active', 'inactive').default('active'),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await COMBO_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(COMBO_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(COMBO_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
}

/**
 * Lấy tất cả combo đang 'active' cho người dùng xem
 */
const getAllAvailable = async ({ q }) => {
  let query = {
    _destroy: false,
    status: 'active'
  }

  // Thêm điều kiện tìm kiếm nếu có từ khóa
  if (q) {
    query.$or = [
      { name: { $regex: new RegExp(q, 'i') } },
      { description: { $regex: new RegExp(q, 'i') } }
    ]
  }

  return await GET_DB().collection(COMBO_COLLECTION_NAME).find(query, {
    projection: {
      name: 1,
      description: 1,
      price: 1
    }
  }).toArray()
}

const update = async (id, data) => {
  // Lọc các trường không được phép cập nhật
  Object.keys(data).forEach(fieldName => {
    if (['createdAt', '_id'].includes(fieldName)) {
      delete data[fieldName]
    }
  })

  // Thêm updatedAt
  data.updatedAt = Date.now()

  return await GET_DB().collection(COMBO_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  )
}

/**
 * Xóa mềm
 */
const deleteOneById = async (id) => {
  return await GET_DB().collection(COMBO_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: Date.now() } }
  )
}

export const comboModel = {
  createNew,
  findOneById,
  getAllAvailable,
  update,
  deleteOneById
}
