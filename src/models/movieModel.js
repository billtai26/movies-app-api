import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const MOVIE_COLLECTION_NAME = 'movies'
const MOVIE_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().min(3).max(100).trim().strict(),
  description: Joi.string().required().min(10).trim().strict(),
  director: Joi.string().required().min(3).max(50).trim().strict(),
  releaseDate: Joi.date().required(),
  durationInMinutes: Joi.number().required().integer().min(30),
  genres: Joi.array().items(Joi.string()).required().min(1),
  posterUrl: Joi.string().required().uri().trim().strict(),
  trailerUrl: Joi.string().required().uri().trim().strict(),
  // Có thể thêm các trạng thái: 'now_showing', 'coming_soon'
  status: Joi.string().valid('now_showing', 'coming_soon').required(),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await MOVIE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(MOVIE_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(MOVIE_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
}

const getAll = async ({ status, q }) => {
  try {
    let query = { _destroy: false }
    if (status) {
      query.status = status
    }

    // Nếu có tham số 'q' (query string)
    if (q) {
    // Thêm điều kiện tìm kiếm vào object query
    // $regex: Tìm tất cả các phim có 'title' chứa chuỗi 'q'
    // $options: 'i': Không phân biệt chữ hoa/thường (case-insensitive)
      query.title = { $regex: new RegExp(q, 'i') }
    }

    // Câu lệnh find bây giờ sẽ bao gồm cả điều kiện lọc VÀ điều kiện tìm kiếm
    return await GET_DB().collection(MOVIE_COLLECTION_NAME).find(query).toArray()

  } catch (error) {
    throw new Error(error)
  }
}

export const movieModel = {
  createNew,
  findOneById,
  getAll
}
