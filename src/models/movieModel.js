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

// CẬP NHẬT HÀM NÀY
const getAll = async ({ status, q, genre }) => { // Thêm 'genre' vào tham số
  try {
    let query = { _destroy: false }

    // Lọc theo status (đã có)
    if (status) {
      query.status = status
    }

    // Tìm kiếm theo tên (đã có)
    if (q) {
      // Dùng $regex hoặc $text tùy bạn chọn
      query.title = { $regex: new RegExp(q, 'i') }
      // Hoặc: query.$text = { $search: q } (nếu dùng Text Index)
    }

    // --- THÊM LOGIC LỌC THEO THỂ LOẠI ---
    if (genre) {
      // Nếu 'genre' là một chuỗi đơn (vd: "Action"), chuyển nó thành mảng một phần tử
      // Nếu 'genre' đã là mảng (vd: ["Action", "Drama"]), giữ nguyên
      const genresToFilter = Array.isArray(genre) ? genre : [genre]

      // Thêm điều kiện: trường 'genres' phải chứa ÍT NHẤT MỘT thể loại trong genresToFilter
      query.genres = { $in: genresToFilter }
    }
    // ------------------------------------

    // Tìm kiếm với tất cả điều kiện
    return await GET_DB().collection(MOVIE_COLLECTION_NAME).find(query).toArray()

  } catch (error) { throw new Error(error) }
}

export const movieModel = {
  createNew,
  findOneById,
  getAll
}
