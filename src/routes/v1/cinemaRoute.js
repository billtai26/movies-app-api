import express from 'express'
import { cinemaController } from '~/controllers/cinemaController'
import { cinemaValidation } from '~/validations/cinemaValidation'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'
import { cinemaHallController } from '~/controllers/cinemaHallController'
import { cinemaHallValidation } from '~/validations/cinemaHallValidation'

const Router = express.Router()

// === Public Routes ===
// Lấy danh sách (hỗ trợ ?q=...&city=...&page=...&limit=...)
Router.route('/')
  .get(cinemaController.getCinemas)

// Lấy chi tiết
Router.route('/:id')
  .get(cinemaController.getCinemaDetails)


// === Admin Routes ===
// Thêm mới
Router.route('/')
  .post(protect, admin, cinemaValidation.createNew, cinemaController.createNew)

// Sửa và Xoá
Router.route('/:id')
  .patch(protect, admin, cinemaValidation.update, cinemaController.updateCinema)
  .delete(protect, admin, cinemaController.deleteCinema)

// === API lồng (Nested) ===

// POST /v1/cinemas/:cinemaId/halls (Thêm phòng mới cho 1 rạp)
Router.route('/:cinemaId/halls')
  .post(
    protect,
    admin,
    cinemaHallValidation.createNew, // Validation sẽ check cả body
    cinemaHallController.createNew // Controller sẽ lấy :cinemaId từ req.params
  )

export const cinemaRoute = Router
