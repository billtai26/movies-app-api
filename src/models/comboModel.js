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
const getAllAvailable = async ({ q, page = 1, limit = 10, priceMin, priceMax, status, sort } = {}) => {
  let query = {
    _destroy: false,
    status: 'active'
  }

  // Nếu admin muốn lọc theo status (ví dụ: active/inactive) từ client
  if (status) {
    query.status = status
  }

  // Từ khóa tìm kiếm
  if (q) {
    query.$or = [
      { name: { $regex: new RegExp(q, 'i') } },
      { description: { $regex: new RegExp(q, 'i') } }
    ]
  }

  // Lọc theo khoảng giá
  const priceFilter = {}
  if (priceMin !== undefined) {
    const min = parseInt(priceMin)
    if (!isNaN(min)) priceFilter.$gte = min
  }
  if (priceMax !== undefined) {
    const max = parseInt(priceMax)
    if (!isNaN(max)) priceFilter.$lte = max
  }
  if (Object.keys(priceFilter).length > 0) {
    query.price = priceFilter
  }

  // Phân trang
  const pageNumber = Math.max(1, parseInt(page) || 1)
  const limitNumber = Math.max(1, parseInt(limit) || 10)
  const skip = (pageNumber - 1) * limitNumber

  // Sắp xếp: hỗ trợ 'price_asc', 'price_desc', 'name_asc', 'name_desc'
  let sortObj = { createdAt: -1 } // default: mới nhất
  if (sort) {
    if (sort === 'price_asc') sortObj = { price: 1 }
    else if (sort === 'price_desc') sortObj = { price: -1 }
    else if (sort === 'name_asc') sortObj = { name: 1 }
    else if (sort === 'name_desc') sortObj = { name: -1 }
  }

  const total = await GET_DB().collection(COMBO_COLLECTION_NAME).countDocuments(query)

  const combos = await GET_DB().collection(COMBO_COLLECTION_NAME)
    .find(query, {
      projection: {
        name: 1,
        description: 1,
        price: 1
      }
    })
    .sort(sortObj)
    .skip(skip)
    .limit(limitNumber)
    .toArray()

  return {
    combos,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    }
  }
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
