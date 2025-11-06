import express from 'express'
import { genreController } from '~/controllers/genreController'
import { genreValidation } from '~/validations/genreValidation'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// === Public Routes ===
// Lấy danh sách (hỗ trợ ?q=...&page=...&limit=...)
Router.route('/')
  .get(genreController.getGenres)

// Lấy chi tiết
Router.route('/:id')
  .get(genreController.getGenreDetails)


// === Admin Routes ===
// Thêm mới
Router.route('/')
  .post(protect, admin, genreValidation.createNew, genreController.createNew)

// Sửa và Xoá
Router.route('/:id')
  .patch(protect, admin, genreValidation.update, genreController.updateGenre)
  .delete(protect, admin, genreController.deleteGenre)

export const genreRoute = Router
