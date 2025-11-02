import { commentService } from '~/services/commentService'
import { ObjectId } from 'mongodb'

const createComment = async (req, res, next) => {
  try {
    const userId = req.user._id.toString() // Lấy từ middleware 'protect'
    const { movieId, content, parentId = null } = req.body

    if (!movieId || !content) {
      return res.status(400).json({ errors: 'movieId and content are required' })
    }

    const newComment = await commentService.createComment(userId, movieId, content, parentId)
    res.status(201).json(newComment)
  } catch (error) {
    next(error)
  }
}

const getCommentsByMovie = async (req, res, next) => {
  try {
    const movieId = req.params.movieId
    if (!ObjectId.isValid(movieId)) {
      return res.status(400).json({ errors: 'Invalid Movie ID format' })
    }

    const commentTree = await commentService.getCommentsByMovie(movieId)
    res.status(200).json(commentTree)
  } catch (error) {
    next(error)
  }
}

export const commentController = {
  createComment,
  getCommentsByMovie
}
