import express from 'express'
import { notificationController } from '~/controllers/notificationController'
import { protect } from '~/middlewares/authMiddleware' // Yêu cầu đăng nhập

const Router = express.Router()

// GET /v1/notifications
// Lấy danh sách thông báo cho user, hỗ trợ phân trang ?page=1&limit=5
Router.route('/')
  .get(protect, notificationController.getNotifications)

// PUT /v1/notifications/:id/read
// Đánh dấu một thông báo là đã đọc
Router.route('/:id/read')
  .put(protect, notificationController.markAsRead)

export const notificationRoute = Router
