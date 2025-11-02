import express from 'express'
import { reviewController } from '~/controllers/reviewController'
import { protect } from '~/middlewares/authMiddleware'
// import { admin } from '~/middlewares/adminMiddleware' // (Dùng nếu bạn muốn admin xóa/sửa review)

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

export const reviewRoute = Router
