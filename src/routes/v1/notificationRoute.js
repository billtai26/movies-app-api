import express from 'express'
import { notificationController } from '~/controllers/notificationController'
import { protect } from '~/middlewares/authMiddleware' // Yêu cầu đăng nhập
import { admin } from '~/middlewares/adminMiddleware'
import { notificationValidation } from '~/validations/notificationValidation'

const Router = express.Router()

// GET /v1/notifications
// Lấy danh sách thông báo cho user, hỗ trợ phân trang ?page=1&limit=5
Router.route('/')
  .get(protect, notificationController.getNotifications)

// PUT /v1/notifications/:id/read
// Đánh dấu một thông báo là đã đọc
Router.route('/:id/read')
  .put(protect, notificationController.markAsRead)

// (Đặt các route của Admin lên trước để tránh xung đột 'admin' với ':id')
// GET /v1/notifications/admin (Lọc, Phân trang)
// POST /v1/notifications/admin (Tạo mới)
Router.route('/admin')
  .get(protect, admin, notificationController.adminGetNotifications)
  .post(protect, admin, notificationValidation.adminCreateNew, notificationController.adminCreateNotification)

// GET /v1/notifications/admin/:id (Xem chi tiết)
// PATCH /v1/notifications/admin/:id (Sửa)
// DELETE /v1/notifications/admin/:id (Xoá)
Router.route('/admin/:id')
  .get(protect, admin, notificationController.adminGetNotificationDetails)
  .patch(protect, admin, notificationValidation.adminUpdate, notificationController.adminUpdateNotification)
  .delete(protect, admin, notificationController.adminDeleteNotification)

export const notificationRoute = Router
