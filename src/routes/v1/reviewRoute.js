import express from 'express'
import { reviewController } from '~/controllers/reviewController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'
// import { reviewValidation } from '~/validations/reviewValidation'

const Router = express.Router()

// --- Định nghĩa các route cho /v1/reviews ---

// Route để Lấy tất cả review (của một phim)
// GET /v1/reviews/movie/:movieId
Router.route('/movie/:movieId')
  .get(reviewController.getReviewsForMovie)

// Route để Thêm một review mới (cho một phim)
// POST /v1/reviews/movie/:movieId
// Yêu cầu đăng nhập (protect)
Router.route('/movie/:movieId')
  .post(protect, reviewController.createReview)

// Route để Sửa (PUT) hoặc Xóa (DELETE) một review cụ thể
// Yêu cầu đăng nhập (protect)
// PUT /v1/reviews/:id
// DELETE /v1/reviews/:id
Router.route('/:id')
  .put(protect, reviewController.updateReview)
  .delete(protect, reviewController.deleteReview)

// === Admin Routes (Mới) ===
// GET /v1/reviews/admin/list (Lọc, Phân trang)
Router.route('/admin/list')
  .get(protect, admin, reviewController.adminGetReviews)

// GET /v1/reviews/admin/:id (Xem chi tiết)
// PATCH /v1/reviews/admin/:id (Sửa)
// DELETE /v1/reviews/admin/:id (Xoá)
Router.route('/admin/:id')
  .get(protect, admin, reviewController.adminGetReviewDetails)
  // .patch(
  //   protect,
  //   admin,
  //   reviewValidation.adminUpdate,
  //   reviewController.adminUpdateReview
  // )
  .delete(protect, admin, reviewController.adminDeleteReview)

export const reviewRoute = Router
