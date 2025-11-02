import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

const NEWS_COLLECTION_NAME = 'news'
const NEWS_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().min(3).max(256).trim().strict(),
  content: Joi.string().required().min(20).trim().strict(),
  author: Joi.string().required().min(3).max(50).default('Admin'),
  imageUrl: Joi.string().required().uri().trim().strict(),

  // 'published': Hiển thị công khai, 'draft': Bản nháp
  status: Joi.string().valid('published', 'draft').default('published'),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await NEWS_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(NEWS_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(NEWS_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
}

/**
 * Lấy danh sách tin tức (Hỗ trợ Lọc, Tìm kiếm, Phân trang)
 */
const getAll = async ({ q, page = 1, limit = 10, status, sort } = {}) => {
  let query = {
    _destroy: false,
    status: 'published' // Mặc định chỉ lấy tin đã xuất bản
  }

  // 1. LỌC (Filter) - Nếu là Admin, có thể truyền ?status=draft
  if (status) {
    query.status = status
  }

  // 2. TÌM KIẾM (Search) - theo Tiêu đề (title) hoặc Nội dung (content)
  if (q) {
    query.$or = [
      { title: { $regex: new RegExp(q, 'i') } },
      { content: { $regex: new RegExp(q, 'i') } }
    ]
  }

  // 3. PHÂN TRANG (Pagination)
  const pageNumber = Math.max(1, parseInt(page) || 1)
  const limitNumber = Math.max(1, parseInt(limit) || 10)
  const skip = (pageNumber - 1) * limitNumber

  // 4. SẮP XẾP (Sort)
  let sortObj = { createdAt: -1 } // Mặc định: tin mới nhất
  if (sort) {
    if (sort === 'title_asc') sortObj = { title: 1 }
    else if (sort === 'title_desc') sortObj = { title: -1 }
  }

  // Lấy tổng số lượng
  const total = await GET_DB().collection(NEWS_COLLECTION_NAME).countDocuments(query)

  // Lấy dữ liệu tin tức
  const news = await GET_DB().collection(NEWS_COLLECTION_NAME)
    .find(query, {
      projection: { // Chỉ lấy các trường cần thiết cho danh sách
        title: 1,
        author: 1,
        imageUrl: 1,
        createdAt: 1,
        status: 1
      }
    })
    .sort(sortObj)
    .skip(skip)
    .limit(limitNumber)
    .toArray()

  // Trả về kết quả
  return {
    news,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber)
    }
  }
}

const update = async (id, data) => {
  Object.keys(data).forEach(fieldName => {
    if (['createdAt', '_id'].includes(fieldName)) {
      delete data[fieldName]
    }
  })
  data.updatedAt = new Date() // Dùng new Date() cho nhất quán

  return await GET_DB().collection(NEWS_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  )
}

const deleteOneById = async (id) => {
  return await GET_DB().collection(NEWS_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

export const newsModel = {
  createNew,
  findOneById,
  getAll,
  update,
  deleteOneById
}
