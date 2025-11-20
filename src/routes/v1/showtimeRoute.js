import express from 'express'
import { showtimeController } from '~/controllers/showtimeController'
import { protect } from '~/middlewares/authMiddleware' // Import middleware xác thực
import { admin } from '~/middlewares/adminMiddleware' // <-- Cần import
import { showtimeValidation } from '~/validations/showtimeValidation'

const Router = express.Router()

// HÀM MỚI: (Public) Lấy danh sách, lọc, phân trang
Router.route('/')
  .get(showtimeController.getShowtimes)

// Route để lấy thông tin chi tiết suất chiếu (ai cũng có thể xem)
Router.route('/:id')
  .get(showtimeController.getShowtimeDetails)

// Route để giữ ghế
// Yêu cầu người dùng phải đăng nhập -> áp dụng middleware `protect`
Router.route('/:id/hold-seats')
  .post(protect, showtimeController.holdSeats)

// Thêm lịch chiếu
Router.route('/')
  .post(protect, admin, showtimeValidation.createNew, showtimeController.createNew)

// Sửa và Xoá lịch chiếu
Router.route('/:id')
  .patch(protect, admin, showtimeValidation.update, showtimeController.updateShowtime)
  .delete(protect, admin, showtimeController.deleteShowtime)

// Thêm route mới để nhả ghế
Router.route('/:id/release-seats')
  .post(protect, showtimeController.releaseSeats)

export const showtimeRoute = Router