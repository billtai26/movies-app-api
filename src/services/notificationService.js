import { notificationModel } from '~/models/notificationModel'
import { userModel } from '~/models/userModel' // Giả sử bạn có userModel
import { mailService } from '~/utils/mailService' // Giả sử bạn có mailService (nodemailer)
import { getIO } from '~/server' // Import getIO từ server.js

/**
 * Hàm trung tâm để tạo và gửi thông báo
 * @param {string} userId - ID của người nhận
 * @param {string} type - 'ticket', 'promotion', 'new_movie', 'system'
 * @param {string} title - Tiêu đề
 * @param {string} message - Nội dung
 * @param {string} link - (Tùy chọn) Đường link khi nhấp vào
 * @param {boolean} sendEmail - (Tùy chọn) Có gửi email hay không
 */
const createNotification = async (userId, type, title, message, link = null, sendEmail = false) => {
  try {
    // 1. Tạo bản ghi thông báo trong Database
    const newNotificationResult = await notificationModel.createNew({
      userId,
      type,
      title,
      message,
      link
    })

    // Lấy lại thông báo đầy đủ vừa tạo
    const newNotification = await notificationModel.findOneById(newNotificationResult.insertedId)

    // 2. Gửi thông báo Real-time qua Socket.io
    const io = getIO()
    // Gửi sự kiện 'new_notification' đến "phòng" riêng của user đó
    io.to(userId.toString()).emit('new_notification', newNotification)

    // 3. (Tùy chọn) Gửi qua Email
    if (sendEmail) {
      const user = await userModel.findOneById(userId)
      if (user && user.email) {
        // (Bạn có thể thêm 1 trường 'settings.receiveEmail' trong userModel để check)
        const emailHtml = `<h1>${title}</h1><p>${message}</p>${link ? `<a href="${link}">Xem chi tiết</a>` : ''}`
        await mailService.sendEmail(user.email, title, emailHtml)
      }
    }

    return newNotification
  } catch (error) {
    console.error('Error creating notification:', error)
    // không ném lỗi để không làm hỏng flow chính (ví dụ: lỡ thanh toán thành công)
  }
}

/**
 * Lấy danh sách thông báo của user (có phân trang)
 */
const getNotificationsForUser = async (userId, queryParams) => {
  const page = queryParams.page || 1
  const limit = queryParams.limit || 10
  return await notificationModel.findByUserId(userId, page, limit)
}

/**
 * Đánh dấu một thông báo là đã đọc
 */
const markNotificationAsRead = async (notificationId, userId) => {
  const notification = await notificationModel.markAsRead(notificationId, userId)
  if (!notification) {
    throw new Error('Notification not found or user not authorized')
  }
  return notification
}

export const notificationService = {
  createNotification,
  getNotificationsForUser,
  markNotificationAsRead
}
