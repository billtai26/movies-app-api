import express from 'express'
import { submissionController } from '~/controllers/submissionController'
import { submissionValidation } from '~/validations/submissionValidation'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'
import { authOptional } from '~/middlewares/authOptionalMiddleware'

const Router = express.Router()

// --- API cho Người dùng (Public) ---
// POST /v1/submissions
// (Không cần 'protect', bất kỳ ai cũng có thể gửi liên hệ)
Router.route('/')
  .post(authOptional, submissionValidation.createSubmission, submissionController.handleCreateSubmission)

// --- API cho Admin (Protected) ---
// GET /v1/submissions
// (Admin xem danh sách, có thể lọc ?type=report&status=new)
Router.route('/')
  .get(protect, admin, submissionController.handleGetSubmissions)

// PUT /v1/submissions/:id/read
// (Admin đánh dấu đã đọc)
Router.route('/:id/read')
  .put(protect, admin, submissionController.handleMarkAsRead)

export const submissionRoute = Router
