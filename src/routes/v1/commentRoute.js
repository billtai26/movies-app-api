import express from 'express'
import { commentController } from '~/controllers/commentController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// POST /v1/comments (Thêm bình luận mới - Yêu cầu đăng nhập)
Router.route('/')
  .post(protect, commentController.createComment)

// GET /v1/comments/movie/:movieId (Lấy tất cả bình luận của 1 phim - Công khai)
Router.route('/movie/:movieId')
  .get(commentController.getCommentsByMovie)

// GET /v1/comments/:id (Lấy 1 comment theo id - Công khai)
Router.route('/:id')
  .get(commentController.getCommentById)
  .put(protect, commentController.updateComment)
  .delete(protect, commentController.deleteComment)

export const commentRoute = Router
