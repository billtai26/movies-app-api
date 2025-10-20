import express from 'express'
import { showtimeController } from '~/controllers/showtimeController'
import { protect } from '~/middlewares/authMiddleware' // Import middleware xác thực

const Router = express.Router()

// Route để lấy thông tin chi tiết suất chiếu (ai cũng có thể xem)
Router.route('/:id')
  .get(showtimeController.getShowtimeDetails)

// Route để giữ ghế
// Yêu cầu người dùng phải đăng nhập -> áp dụng middleware `protect`
Router.route('/:id/hold-seats')
  .post(protect, showtimeController.holdSeats)

export const showtimeRoute = Router