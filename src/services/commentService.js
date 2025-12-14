import { commentModel } from '~/models/commentModel'
import { getIO } from '~/utils/socket' // Import hàm getIO từ server.js

/**
 * Xây dựng cây bình luận từ một danh sách phẳng
 */
const buildCommentTree = (comments) => {
  const commentMap = {}
  const commentTree = []

  // Đưa tất cả comment vào map
  comments.forEach(comment => {
    comment.children = []
    commentMap[comment._id] = comment
  })

  // Xây dựng cây
  comments.forEach(comment => {
    if (comment.parentId) {
      // Nếu là reply, tìm comment cha và thêm vào mảng children
      const parent = commentMap[comment.parentId]
      if (parent) {
        parent.children.push(comment)
      }
    } else {
      // Nếu là comment gốc, thêm vào cấp cao nhất
      commentTree.push(comment)
    }
  })

  return commentTree
}

/**
 * Tạo bình luận mới
 */
const createComment = async (userId, movieId, content, parentId) => {
  // 1. Tạo và lưu vào DB
  const dataToCreate = {
    userId,
    movieId,
    content,
    parentId
  }
  const createdResult = await commentModel.createNew(dataToCreate)

  // 2. Lấy lại comment vừa tạo (để populate thông tin user)
  const [newComment] = await commentModel.findOneById(createdResult.insertedId)
  if (!newComment) {
    throw new Error('Failed to create or find new comment')
  }

  // 3. (Real-time) Gửi sự kiện Socket.io
  try {
    const io = getIO()
    // Gửi sự kiện 'new_comment' đến TẤT CẢ client đang ở trong "phòng" của phim này
    io.to(movieId).emit('new_comment', newComment)
  } catch (error) {
    // console.error('Socket.io emit error:', error)
  }

  return newComment
}

/**
 * Lấy cây bình luận cho một phim
 */
const getCommentsByMovie = async (movieId) => {
  // 1. Lấy danh sách comment phẳng từ DB
  const flatComments = await commentModel.findByMovieId(movieId)

  // 2. Xây dựng cấu trúc cây
  const commentTree = buildCommentTree(flatComments)

  return commentTree
}

/**
 * Lấy 1 comment theo id
 */
const getCommentById = async (id) => {
  const results = await commentModel.findOneById(id)
  return results[0] || null
}

/**
 * Cập nhật comment
 */
// Sửa tham số thứ 2 từ 'content' thành 'data'
const updateComment = async (id, data) => {
  const updated = await commentModel.updateById(id, data) // Truyền nguyên object data

  try {
    const io = getIO()
    if (updated && updated.movieId) {
      io.to(updated.movieId.toString()).emit('update_comment', updated)
    }
  } catch (error) {
    // ignore
  }

  return updated
}

/**
 * Xóa (soft-delete) comment
 */
const deleteComment = async (id) => {
  const deleted = await commentModel.markDeleteById(id)

  try {
    const io = getIO()
    if (deleted && deleted.movieId) {
      io.to(deleted.movieId.toString()).emit('delete_comment', deleted)
    }
  } catch (error) {
    // ignore socket errors
  }

  return deleted
}

// --- THÊM HÀM NÀY ---
const getAllComments = async () => {
  return await commentModel.getAll()
}

export const commentService = {
  createComment,
  getCommentsByMovie,
  updateComment,
  getCommentById,
  deleteComment,
  getAllComments
}
