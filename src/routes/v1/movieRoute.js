import express from 'express'
import { movieController } from '~/controllers/movieController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// Route để lấy danh sách phim (có thể lọc)
Router.route('/')
  .get(movieController.getMovies)// Áp dụng `protect` (xác thực) và `admin` (phân quyền)
  .post(protect, admin, movieController.createNew)

// Route để lấy chi tiết một phim
Router.route('/:id')
  .get(movieController.getMovieDetails)

export const movieRoute = Router
