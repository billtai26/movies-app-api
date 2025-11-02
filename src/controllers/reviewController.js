/* eslint-disable no-unused-vars */
import { reviewService } from '~/services/reviewService'
import { ObjectId } from 'mongodb'

const createReview = async (req, res, next) => {
  try {
    const userId = req.user._id.toString() // Lấy từ middleware 'protect'
    const movieId = req.params.movieId // Lấy từ URL

    // Kiểm tra định dạng ObjectId (nếu cần)
    if (!ObjectId.isValid(movieId)) {
      return res.status(400).json({ errors: 'Invalid Movie ID format' })
    }

    // req.body chứa { rating, comment }
    const createdReview = await reviewService.createReview(userId, movieId, req.body)
    res.status(201).json(createdReview)
  } catch (error) {
    // Xử lý lỗi (vd: "You have already reviewed this movie")
    // Trả về 400 (Bad Request) hoặc 409 (Conflict) sẽ tốt hơn 500
    res.status(400).json({ errors: error.message })
  }
}

const getReviewsForMovie = async (req, res, next) => {
  try {
    const movieId = req.params.movieId
    if (!ObjectId.isValid(movieId)) {
      return res.status(400).json({ errors: 'Invalid Movie ID format' })
    }

    // req.query chứa { page, limit }
    const result = await reviewService.getReviewsForMovie(movieId, req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error) // Chuyển lỗi 500 cho middleware xử lý chung
  }
}

const updateReview = async (req, res, next) => {
  try {
    const userId = req.user._id // Lấy từ middleware 'protect'
    const reviewId = req.params.id // Lấy từ URL

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({ errors: 'Invalid Review ID format' })
    }

    // req.body chứa { rating, comment }
    const updatedReview = await reviewService.updateReview(reviewId, userId, req.body)
    res.status(200).json(updatedReview)
  } catch (error) {
    // Thường lỗi ở đây là "không có quyền" (lỗi 403)
    res.status(403).json({ errors: error.message })
  }
}

const deleteReview = async (req, res, next) => {
  try {
    const userId = req.user._id // Lấy từ middleware 'protect'
    const reviewId = req.params.id // Lấy từ URL

    if (!ObjectId.isValid(reviewId)) {
      return res.status(400).json({ errors: 'Invalid Review ID format' })
    }

    const result = await reviewService.deleteReview(reviewId, userId)
    res.status(200).json(result)
  } catch (error) {
    // Thường lỗi ở đây là "không có quyền" (lỗi 403)
    res.status(403).json({ errors: error.message })
  }
}

export const reviewController = {
  createReview,
  getReviewsForMovie,
  updateReview,
  deleteReview
}
