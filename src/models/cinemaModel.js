import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const CINEMA_COLLECTION_NAME = 'cinemas'
const CINEMA_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required().min(3).max(100).trim().strict(),
  address: Joi.string().required().min(10).max(255).trim().strict(),
  city: Joi.string().required().min(3).max(50).trim().strict(),
  phone: Joi.string().optional().max(20).trim().strict().allow(''),
  logoUrl: Joi.string().optional().uri().trim().strict().allow(''),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await CINEMA_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(CINEMA_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(CINEMA_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false
  })
}

// Dùng để check trùng tên
const findByName = async (name) => {
  return await GET_DB().collection(CINEMA_COLLECTION_NAME).findOne({ name: name })
}

const update = async (id, data) => {
  delete data._id
  return await GET_DB().collection(CINEMA_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id), _destroy: false },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  )
}

const softDelete = async (id) => {
  return await GET_DB().collection(CINEMA_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

const getAll = async (filters = {}, pagination = {}) => {
  try {
    const { q, city } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }
    if (q) query.name = { $regex: new RegExp(q, 'i') } // Tìm theo tên
    if (city) query.city = { $regex: new RegExp(city, 'i') } // Lọc theo thành phố

    const totalCinemas = await GET_DB().collection(CINEMA_COLLECTION_NAME).countDocuments(query)
    const cinemas = await GET_DB().collection(CINEMA_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      cinemas,
      pagination: {
        totalItems: totalCinemas,
        totalPages: Math.ceil(totalCinemas / limit),
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

export const cinemaModel = {
  createNew,
  findOneById,
  findByName,
  update,
  softDelete,
  getAll
}
