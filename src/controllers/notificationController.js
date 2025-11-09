import { notificationService } from '~/services/notificationService'
import { ObjectId } from 'mongodb'

/**
 * Lấy danh sách thông báo (đã phân trang) cho user đang đăng nhập
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id // Lấy từ middleware 'protect'
    const result = await notificationService.getNotificationsForUser(userId, req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * Đánh dấu một thông báo là đã đọc
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id // Lấy từ middleware 'protect'
    const notificationId = req.params.id // Lấy từ URL

    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({ errors: 'Invalid Notification ID format' })
    }

    const notification = await notificationService.markNotificationAsRead(notificationId, userId)
    res.status(200).json(notification)
  } catch (error) {
    res.status(404).json({ errors: error.message }) // 404 nếu không tìm thấy
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) GET /admin
 */
const adminGetNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.adminGetNotifications(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) POST /admin
 */
const adminCreateNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.adminCreateNotification(req.body)
    res.status(201).json(notification)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) GET /admin/:id
 */
const adminGetNotificationDetails = async (req, res, next) => {
  try {
    const notification = await notificationService.adminGetNotificationDetails(req.params.id)
    res.status(200).json(notification)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) PATCH /admin/:id
 */
const adminUpdateNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.adminUpdateNotification(req.params.id, req.body)
    res.status(200).json(notification)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) DELETE /admin/:id
 */
const adminDeleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.adminDeleteNotification(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const notificationController = {
  // User
  getNotifications,
  markAsRead,
  // Admin
  adminGetNotifications,
  adminCreateNotification,
  adminGetNotificationDetails,
  adminUpdateNotification,
  adminDeleteNotification
}
