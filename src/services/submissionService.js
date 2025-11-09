import { submissionModel } from '~/models/submissionModel'
import { mailService } from '~/utils/mailService' // Import mail service của bạn
import { env } from '~/config/environment' // Import env để lấy email admin
import { ApiError } from '~/utils/ApiError'

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
      // eslint-disable-next-line no-console
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
 * NÂNG CẤP: Đổi tên 'markAsRead' thành 'adminUpdateStatus'
 */
const adminUpdateStatus = async (submissionId, newStatus) => {
  // Model đã có sẵn hàm updateStatus (id, newStatus)
  const updated = await submissionModel.updateStatus(submissionId, newStatus)
  if (!updated) {
    throw new ApiError(404, 'Submission not found or update failed')
  }
  return updated
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết
 */
const adminGetSubmissionDetails = async (submissionId) => {
  const submission = await submissionModel.findOneById(submissionId)
  if (!submission) {
    throw new ApiError(404, 'Submission not found')
  }
  return submission
}

/**
 * HÀM MỚI: (Admin) Xoá mềm
 */
const adminDeleteSubmission = async (submissionId) => {
  const submission = await submissionModel.findOneById(submissionId)
  if (!submission) {
    throw new ApiError(404, 'Submission not found')
  }
  await submissionModel.softDelete(submissionId)
  return { message: 'Submission soft deleted successfully' }
}

export const submissionService = {
  createSubmission,
  getSubmissions,
  adminUpdateStatus,
  adminGetSubmissionDetails,
  adminDeleteSubmission
}
