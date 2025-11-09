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
Router.route('/admin')
  .get(protect, admin, submissionController.handleGetSubmissions)

// GET /v1/submissions/admin/:id (Xem chi tiết)
// PATCH /v1/submissions/admin/:id (Sửa status)
// DELETE /v1/submissions/admin/:id (Xoá mềm)
Router.route('/admin/:id')
  .get(protect, admin, submissionController.adminGetSubmissionDetails)
  .patch(
    protect,
    admin,
    submissionValidation.adminUpdateStatus,
    submissionController.adminUpdateStatus
  )
  .delete(protect, admin, submissionController.adminDeleteSubmission)

export const submissionRoute = Router
