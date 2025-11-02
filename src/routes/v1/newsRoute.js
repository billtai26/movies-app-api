import express from 'express'
import { newsController } from '~/controllers/newsController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// === API cho người dùng (Public) ===

// GET /v1/news - Lấy danh sách (có Tìm kiếm, Lọc, Phân trang)
Router.route('/')
  .get(newsController.getAllNews)

// GET /v1/news/:id - XEM CHI TIẾT
Router.route('/:id')
  .get(newsController.getNewsDetails)

// === API cho Admin (Protected) ===

// POST /v1/news - THÊM tin mới
Router.route('/')
  .post(protect, admin, newsController.createNew)

// PUT /v1/news/:id - SỬA tin
Router.route('/:id')
  .put(protect, admin, newsController.updateNews)

// DELETE /v1/news/:id - XOÁ tin (mềm)
Router.route('/:id')
  .delete(protect, admin, newsController.deleteNews)

export const newsRoute = Router
