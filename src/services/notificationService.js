import { notificationModel } from '~/models/notificationModel'
import { userModel } from '~/models/userModel'
import { mailService } from '~/utils/mailService'
import { getIO } from '~/utils/socket'
import { ApiError } from '~/utils/ApiError'

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
    // 1. Kiểm tra User có tồn tại không
    const user = await userModel.findOneById(userId)
    if (!user) {
      throw new ApiError(404, `User not found with id: ${userId}`)
    }

    // 2. Tạo bản ghi
    const newNotificationResult = await notificationModel.createNew({
      userId, type, title, message, link
    })
    const newNotification = await notificationModel.findOneById(newNotificationResult.insertedId)

    // 3. Gửi Socket.io
    const io = getIO()
    io.to(userId.toString()).emit('new_notification', newNotification)

    // 4. Gửi Email (Nếu user còn tồn tại và yêu cầu)
    if (sendEmail && user.email) {
      const emailHtml = `<h1>${title}</h1><p>${message}</p>${link ? `<a href="${link}">Xem chi tiết</a>` : ''}`
      await mailService.sendEmail(user.email, title, emailHtml)
    }

    return newNotification
  } catch (error) {
    // Nếu lỗi là ApiError, ném ra
    if (error instanceof ApiError) throw error
    // Nếu là lỗi khác, ghi log nhưng không làm hỏng flow chính
    // eslint-disable-next-line no-console
    console.error('Error creating notification:', error)
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

/**
 * HÀM MỚI: (Admin) Tạo thông báo thủ công
 */
const adminCreateNotification = async (reqBody) => {
  const { target, username, ...otherData } = reqBody

  let targetUserId = null

  if (target === 'user') {
    // Tìm user bằng username
    const user = await userModel.findByUsername(username)
    if (!user) {
      throw new ApiError(404, `Không tìm thấy người dùng: ${username}`)
    }

    // 3. QUAN TRỌNG: Chuyển ObjectId sang String
    // Joi.string() chỉ nhận chuỗi, nếu đưa object vào sẽ lỗi
    targetUserId = user._id.toString()
  }

  const newNotificationData = {
    ...otherData,
    userId: targetUserId // String hoặc null
  }

  return await notificationModel.createNew(newNotificationData)
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách (Lọc, Phân trang)
 */
const adminGetNotifications = async (queryParams) => {
  const { userId, type, isRead, q, page, limit } = queryParams

  const filters = { userId, type, isRead: isRead, q }

  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 10
  const skip = (pageNum - 1) * limitNum
  const pagination = { page: pageNum, limit: limitNum, skip }

  return await notificationModel.adminGetAll(filters, pagination)
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết 1 thông báo
 */
const adminGetNotificationDetails = async (notificationId) => {
  const notification = await notificationModel.findOneById(notificationId)
  if (!notification) {
    throw new ApiError(404, 'Notification not found')
  }
  return notification
}

/**
 * HÀM MỚI: (Admin) Sửa 1 thông báo
 */
const adminUpdateNotification = async (notificationId, updateData) => {
  const updatedNotification = await notificationModel.adminUpdate(notificationId, updateData)
  if (!updatedNotification) {
    throw new ApiError(404, 'Notification not found or update failed')
  }
  return updatedNotification
}

/**
 * HÀM MỚI: (Admin) Xoá 1 thông báo
 */
const adminDeleteNotification = async (notificationId) => {
  const notification = await notificationModel.findOneById(notificationId)
  if (!notification) {
    throw new ApiError(404, 'Notification not found')
  }

  await notificationModel.adminSoftDelete(notificationId)
  return { message: 'Notification soft deleted successfully' }
}

export const notificationService = {
  createNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  adminCreateNotification,
  adminGetNotifications,
  adminGetNotificationDetails,
  adminUpdateNotification,
  adminDeleteNotification
}
