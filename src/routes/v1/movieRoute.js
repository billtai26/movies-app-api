import express from 'express'
import { movieController } from '~/controllers/movieController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'
import { movieValidation } from '~/validations/movieValidation'
import { upload } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

// Route để lấy danh sách phim (có thể lọc)
Router.route('/')
  .get(movieController.getMovies)// Áp dụng `protect` (xác thực) và `admin` (phân quyền)
  .post(protect, admin, movieValidation.createNew, movieController.createNew)

// Route để lấy chi tiết một phim
Router.route('/:id')
  .get(movieController.getMovieDetails)
  .put(protect, admin, movieValidation.update, movieController.updateMovie) // <-- ROUTE SỬA
  .patch(protect, admin, movieValidation.update, movieController.updateMovie) // <-- ROUTE SỬA
  .delete(protect, admin, movieController.deleteMovie)

// --- HÀM MỚI ---
// API cho Admin upload poster cho một phim
Router.route('/:id/poster')
  .patch(
    protect,
    admin, // <-- Yêu cầu Admin
    upload.single('poster'), // <-- Multer bắt file tên 'poster'
    movieController.updateMoviePoster // <-- Hàm controller mới
  )

export const movieRoute = Router
