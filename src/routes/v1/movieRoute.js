import express from 'express'
import { movieController } from '~/controllers/movieController'

const Router = express.Router()

// Route để lấy danh sách phim (có thể lọc)
Router.route('/')
  .get(movieController.getMovies)
  // Tạm thời tạo route POST để thêm phim, sau này sẽ cần middleware check quyền admin
  .post(movieController.createNew)

// Route để lấy chi tiết một phim
Router.route('/:id')
  .get(movieController.getMovieDetails)

export const movieRoute = Router
