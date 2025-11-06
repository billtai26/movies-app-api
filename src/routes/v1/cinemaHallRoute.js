import express from 'express'
import { cinemaHallController } from '~/controllers/cinemaHallController'
import { cinemaHallValidation } from '~/validations/cinemaHallValidation'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// === API cho Ghế (Seat) ===
// Sửa 1 ghế cụ thể (báo hỏng, đổi loại)
// Dùng PATCH /:hallId/seats
Router.route('/:hallId/seats')
  .patch(
    protect,
    admin,
    cinemaHallValidation.updateSeat,
    cinemaHallController.updateSeat
  )

// === API cho Phòng chiếu (Hall) ===

// Lấy danh sách (Lọc, Tìm, Phân trang) - Public hoặc Admin
Router.route('/')
  .get(cinemaHallController.getHalls)
  // Thêm phòng (Admin - Tự động tạo ghế)
  .post(
    protect,
    admin,
    cinemaHallValidation.createNew,
    cinemaHallController.createNew
  )

// Lấy chi tiết (Public) - Sửa - Xoá (Admin)
Router.route('/:id')
  // Xem chi tiết (Lấy cả phòng và mảng ghế)
  .get(cinemaHallController.getHallDetails)
  // Sửa thông tin chung (Tên, Loại)
  .patch(
    protect,
    admin,
    cinemaHallValidation.updateHall,
    cinemaHallController.updateHall
  )
  // Xoá mềm phòng
  .delete(
    protect,
    admin,
    cinemaHallController.deleteHall
  )

export const cinemaHallRoute = Router
