import express from 'express'
import { movieController } from '~/controllers/movieController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'
import { movieValidation } from '~/validations/movieValidation'

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

export const movieRoute = Router
