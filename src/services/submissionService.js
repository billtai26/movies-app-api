import { submissionModel } from '~/models/submissionModel'
import { mailService } from '~/utils/mailService' // Import mail service của bạn
import { env } from '~/config/environment' // Import env để lấy email admin

/**
 * Tạo submission mới VÀ gửi email thông báo cho Admin
 */
const createSubmission = async (data, userId = null) => {
  const dataToCreate = {
    ...data,
    userId: userId // Gán userId nếu user đã đăng nhập
  }

  // 1. Lưu vào CSDL
  const newSubmission = await submissionModel.createNew(dataToCreate)

  // 2. Gửi email thông báo cho Admin
  // (Giả sử MAIL_USER trong .env là email của Admin)
  if (env.MAIL_USER) {
    const subject = `[${data.type.toUpperCase()}] Thông báo mới: ${data.subject}`
    const emailHtml = `
        <div>
          <h3>Bạn có một thông báo <b>${data.type}</b> mới từ:</h3>
          <p><strong>Tên:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <h3>Nội dung:</h3>
          <p>${data.message.replace(/\n/g, '<br>')}</p>
          <p><i><strong>UserID</strong>: ${userId || 'N/A'}</i></p>
        </div>
      `
    // Gửi email mà không cần await để không block response của user
    mailService.sendEmail(env.MAIL_USER, subject, emailHtml)
      .catch(err => console.error('Failed to send admin notification email:', err))
  }

  return newSubmission
}

/**
 * Lấy danh sách (cho Admin)
 */
const getSubmissions = async (queryParams) => {
  return await submissionModel.getAll(queryParams)
}

/**
 * Đánh dấu đã đọc (cho Admin)
 */
const markAsRead = async (submissionId) => {
  const updated = await submissionModel.updateStatus(submissionId, 'read')
  if (!updated) throw new Error('Submission not found')
  return updated
}

export const submissionService = {
  createSubmission,
  getSubmissions,
  markAsRead
}
