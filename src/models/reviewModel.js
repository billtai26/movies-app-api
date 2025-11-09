import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const REVIEW_COLLECTION_NAME = 'reviews'
const REVIEW_COLLECTION_SCHEMA = Joi.object({
  movieId: Joi.string().required(),
  userId: Joi.string().required(),
  rating: Joi.number().required().min(1).max(5),
  comment: Joi.string().trim().strict().max(1000).allow(null, ''),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await REVIEW_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  validData.movieId = new ObjectId(validData.movieId)
  validData.userId = new ObjectId(validData.userId)
  return await GET_DB().collection(REVIEW_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false // CHỈ TÌM REVIEW CHƯA BỊ XÓA
  })
}

const findOneByUserAndMovie = async (userId, movieId) => {
  return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOne({
    userId: new ObjectId(userId),
    movieId: new ObjectId(movieId),
    _destroy: false // CHỈ TÌM REVIEW CHƯA BỊ XÓA
  })
}

const getByMovieId = async (movieId, page = 1, limit = 10) => {
  const query = { movieId: new ObjectId(movieId), _destroy: false } // CHỈ LẤY REVIEW CHƯA BỊ XÓA
  const pageNumber = Math.max(1, parseInt(page) || 1)
  const limitNumber = Math.max(1, parseInt(limit) || 10)
  const skip = (pageNumber - 1) * limitNumber

  const total = await GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments(query)

  const reviews = await GET_DB().collection(REVIEW_COLLECTION_NAME)
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber)
    .toArray()

  return {
    reviews,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    }
  }
}

const update = async (id, data) => {
  const updateData = {
    rating: data.rating,
    comment: data.comment,
    updatedAt: new Date()
  }

  return await GET_DB().collection(REVIEW_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateData },
    { returnDocument: 'after' }
  )
}

/**
 * Xóa mềm một đánh giá
 */
const softDeleteOneById = async (id) => {
  return await GET_DB().collection(REVIEW_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: {
      _destroy: true,
      updatedAt: new Date()
    }
    }
  )
}

/**
 * Tính toán điểm trung bình (chỉ tính các review chưa bị xóa)
 */
const calculateAverageRating = async (movieId) => {
  const result = await GET_DB().collection(REVIEW_COLLECTION_NAME).aggregate([
    {
      $match: { movieId: new ObjectId(movieId), _destroy: false } // Đảm bảo chỉ tính review chưa xóa
    },
    {
      $group: {
        _id: '$movieId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]).toArray()

  return result[0] || { averageRating: 0, reviewCount: 0 }
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách, lọc, phân trang
 */
const adminGetAll = async (filters = {}, pagination = {}) => {
  try {
    const { userId, movieId, q } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    // Lọc theo các ID
    if (userId) query.userId = new ObjectId(userId)
    if (movieId) query.movieId = new ObjectId(movieId)

    // Tìm kiếm (theo nội dung comment)
    if (q) {
      query.comment = { $regex: new RegExp(q, 'i') }
    }

    const total = await GET_DB().collection(REVIEW_COLLECTION_NAME).countDocuments(query)
    const reviews = await GET_DB().collection(REVIEW_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    return {
      reviews,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

export const reviewModel = {
  createNew,
  findOneById,
  findOneByUserAndMovie,
  getByMovieId,
  update,
  softDeleteOneById,
  calculateAverageRating,
  adminGetAll
}
