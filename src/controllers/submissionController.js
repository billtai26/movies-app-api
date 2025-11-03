import { submissionService } from '~/services/submissionService'
import { ObjectId } from 'mongodb'

/**
 * Xử lý khi user gửi liên hệ/feedback/report
 */
const handleCreateSubmission = async (req, res, next) => {
  try {
    // Lấy userId (nếu user đã đăng nhập), không bắt buộc
    const userId = req.user ? req.user._id.toString() : null

    await submissionService.createSubmission(req.body, userId)

    res.status(201).json({
      success: true,
      message: 'Your submission has been received. We will get back to you soon!'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * (Admin) Lấy danh sách submissions (có phân trang, lọc)
 */
const handleGetSubmissions = async (req, res, next) => {
  try {
    const result = await submissionService.getSubmissions(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * (Admin) Đánh dấu là đã đọc
 */
const handleMarkAsRead = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ errors: 'Invalid Submission ID format' })
    }

    const result = await submissionService.markAsRead(id)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const submissionController = {
  handleCreateSubmission,
  handleGetSubmissions,
  handleMarkAsRead
}
