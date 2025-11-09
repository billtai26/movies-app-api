import { reviewModel } from '~/models/reviewModel'
import { movieModel } from '~/models/movieModel'
import { ApiError } from '~/utils/ApiError'

/**
 * (Hàm nội bộ) Dùng để cập nhật điểm trung bình của phim sau mỗi thay đổi
 * @param {string} movieId - ID của phim cần cập nhật
 */
const _updateMovieRating = async (movieId) => {
  try {
    // 1. Tính toán điểm trung bình và số lượng đánh giá mới từ reviewModel
    const ratingData = await reviewModel.calculateAverageRating(movieId)

    // 2. Cập nhật thông tin vào movieModel
    // ratingData có thể là { averageRating: 4.5, reviewCount: 2 }
    await movieModel.updateRating(
      movieId,
      ratingData.averageRating,
      ratingData.reviewCount
    )
  } catch (error) {
    // console.error(`Error updating movie rating for ${movieId}:`, error)
    // Không ném lỗi ở đây để không làm hỏng flow chính (vd: lỡ xóa review thành công)
  }
}

/**
 * Tạo một đánh giá mới
 */
const createReview = async (userId, movieId, reviewData) => {
  // 1. Kiểm tra xem user đã review phim này chưa?
  const existingReview = await reviewModel.findOneByUserAndMovie(userId, movieId)
  if (existingReview) {
    throw new Error('You have already reviewed this movie.')
  }

  // 2. Tạo review mới
  const dataToCreate = {
    ...reviewData,
    userId: userId,
    movieId: movieId
  }
  const createdReviewResult = await reviewModel.createNew(dataToCreate)
  const createdReview = await reviewModel.findOneById(createdReviewResult.insertedId)

  // 3. Cập nhật lại điểm trung bình cho phim (bất đồng bộ)
  _updateMovieRating(movieId)

  return createdReview
}

/**
 * Lấy tất cả đánh giá của một phim (có phân trang)
 */
const getReviewsForMovie = async (movieId, queryParams) => {
  const page = queryParams.page || 1
  const limit = queryParams.limit || 10
  return await reviewModel.getByMovieId(movieId, page, limit)
}

/**
 * User cập nhật đánh giá của chính họ
 */
const updateReview = async (reviewId, userId, updateData) => {
  // 1. Tìm review
  const review = await reviewModel.findOneById(reviewId)
  if (!review || review._destroy) {
    throw new Error('Review not found')
  }

  // 2. Kiểm tra quyền sở hữu
  if (review.userId.toString() !== userId.toString()) {
    throw new Error('You are not authorized to update this review')
  }

  // 3. Cập nhật (chỉ rating và comment)
  const updatedReview = await reviewModel.update(reviewId, updateData)

  // 4. Cập nhật lại điểm trung bình (bất đồng bộ)
  _updateMovieRating(review.movieId)

  return updatedReview
}

/**
 * User xóa đánh giá của chính họ
 */
const deleteReview = async (reviewId, userId) => {
  // 1. Tìm review
  const review = await reviewModel.findOneById(reviewId)
  if (!review || review._destroy) {
    throw new Error('Review not found')
  }

  // 2. Kiểm tra quyền sở hữu
  if (review.userId.toString() !== userId.toString()) {
    throw new Error('You are not authorized to delete this review')
  }

  // 3. Xóa
  await reviewModel.softDeleteOneById(reviewId)

  // 4. Cập nhật lại điểm trung bình (bất đồng bộ)
  _updateMovieRating(review.movieId)

  return { message: 'Review deleted successfully' }
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách (Lọc, Phân trang)
 */
const adminGetReviews = async (queryParams) => {
  const { userId, movieId, q, page, limit } = queryParams
  
  const filters = { userId, movieId, q }
  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 10
  const skip = (pageNum - 1) * limitNum
  const pagination = { page: pageNum, limit: limitNum, skip }

  return await reviewModel.adminGetAll(filters, pagination)
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết 1 review
 */
const adminGetReviewDetails = async (reviewId) => {
  const review = await reviewModel.findOneById(reviewId)
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }
  return review
}

/**
 * HÀM MỚI: (Admin) Xoá 1 review (bỏ qua check userId)
 */
const adminDeleteReview = async (reviewId) => {
  // 1. Tìm review (để lấy movieId)
  const review = await reviewModel.findOneById(reviewId)
  if (!review) {
    throw new ApiError(404, 'Review not found')
  }

  // 2. Xoá mềm
  await reviewModel.softDeleteOneById(reviewId)

  // 3. Cập nhật lại điểm trung bình
  _updateMovieRating(review.movieId.toString())

  return { message: 'Review soft deleted by admin successfully' }
}

export const reviewService = {
  createReview,
  getReviewsForMovie,
  updateReview,
  deleteReview,
  adminGetReviews,
  adminGetReviewDetails,
  // adminUpdateReview,
  adminDeleteReview
}
