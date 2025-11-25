import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants' // Giả sử bạn có file này

const COMMENT_COLLECTION_NAME = 'comments'
const COMMENT_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  movieId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  content: Joi.string().required().min(1).max(1000).trim().strict(),

  // parentId dùng để liên kết với bình luận cha (nếu là reply)
  // Nếu là bình luận gốc, parentId = null
  parentId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE).allow(null),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const createNew = async (data) => {
  const validData = await COMMENT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })

  const dataToInsert = {
    ...validData,
    userId: new ObjectId(validData.userId),
    movieId: new ObjectId(validData.movieId),
    parentId: validData.parentId ? new ObjectId(validData.parentId) : null
  }

  return await GET_DB().collection(COMMENT_COLLECTION_NAME).insertOne(dataToInsert)
}

// Hàm này dùng để lấy comment ngay sau khi tạo (để populate user)
const findOneById = async (id) => {
  return await GET_DB().collection(COMMENT_COLLECTION_NAME).aggregate([
    { $match: { _id: new ObjectId(id) } },
    {
      $lookup: {
        from: 'users', // Tên collection 'users'
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          { $project: { username: 1, _id: 0 } } // Chỉ lấy username
        ]
      }
    },
    { $unwind: '$user' }
  ]).toArray()
}

// Lấy tất cả comment của một phim (để xây dựng cây)
const findByMovieId = async (movieId) => {
  return await GET_DB().collection(COMMENT_COLLECTION_NAME).aggregate([
    { $match: {
      movieId: new ObjectId(movieId),
      _destroy: false
    }
    },
    { $sort: { createdAt: 1 } }, // Sắp xếp từ cũ đến mới
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          { $project: { username: 1 } } // Lấy username và _id (để client có thể link)
        ]
      }
    },
    { $unwind: '$user' }
  ]).toArray()
}

// Cập nhật nội dung comment theo id
const updateById = async (id, data) => {
  const setData = {
    ...data,
    updatedAt: Date.now()
  }

  await GET_DB().collection(COMMENT_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: setData }
  )

  // Trả về comment đã cập nhật (populate user)
  const [updated] = await findOneById(id)
  return updated
}

// Xóa mềm comment (đánh dấu _destroy = true)
const markDeleteById = async (id) => {
  await GET_DB().collection(COMMENT_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: Date.now() } }
  )

  const [deleted] = await findOneById(id)
  return deleted
}

export const commentModel = {
  createNew,
  findOneById,
  findByMovieId,
  updateById,
  markDeleteById
}
