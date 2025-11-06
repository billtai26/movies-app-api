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

  // --- THÊM CÁC TRƯỜNG ĐÁNH GIÁ ---
  averageRating: Joi.number().default(0), // Điểm trung bình
  reviewCount: Joi.number().integer().default(0), // Tổng số lượt đánh giá
  // ---------------------------------

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await MOVIE_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(MOVIE_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(MOVIE_COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    _destroy: false // Chỉ tìm phim chưa bị xoá
  })
}

// CẬP NHẬT HÀM NÀY
const getAll = async (filters = {}, pagination = {}) => {
  try {
    const { status, q, genre } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    // Lọc theo status
    if (status) {
      query.status = status
    }

    // Tìm kiếm theo tên
    if (q) {
      query.title = { $regex: new RegExp(q, 'i') }
    }

    // Lọc theo thể loại
    if (genre) {
      const genresToFilter = Array.isArray(genre) ? genre : [genre]
      query.genres = { $in: genresToFilter }
    }

    // ----- THỰC THI 2 TRUY VẤN -----
    // 1. Truy vấn lấy tổng số document (để phân trang)
    const totalMovies = await GET_DB().collection(MOVIE_COLLECTION_NAME).countDocuments(query)

    // 2. Truy vấn lấy data (có phân trang)
    const movies = await GET_DB().collection(MOVIE_COLLECTION_NAME)
      .find(query)
      .sort({ createdAt: -1 }) // Sắp xếp phim mới nhất lên đầu
      .skip(skip)
      .limit(limit)
      .toArray()

    // 3. Trả về kết quả
    return {
      movies,
      pagination: {
        totalMovies,
        totalPages: Math.ceil(totalMovies / limit),
        currentPage: page,
        limit
      }
    }

  } catch (error) { throw new Error(error) }
}

// HÀM MỚI: Cập nhật điểm trung bình cho phim
const updateRating = async (id, averageRating, reviewCount) => {
  return await GET_DB().collection(MOVIE_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: {
      averageRating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
      reviewCount: reviewCount,
      updatedAt: new Date()
    }
    },
    { returnDocument: 'after' }
  )
}

// HÀM MỚI: Cập nhật thông tin chung
const update = async (id, data) => {
  // Loại bỏ các trường không được phép cập nhật (nếu có)
  delete data.averageRating
  delete data.reviewCount
  delete data._id

  return await GET_DB().collection(MOVIE_COLLECTION_NAME).findOneAndUpdate(
    {
      _id: new ObjectId(id),
      _destroy: false
    }, // Chỉ cập nhật phim chưa bị xoá
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' } // Trả về document sau khi update
  )
}

// HÀM MỚI: Xoá mềm
const softDelete = async (id) => {
  return await GET_DB().collection(MOVIE_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

export const movieModel = {
  createNew,
  findOneById,
  getAll,
  updateRating,
  update,
  softDelete
}
