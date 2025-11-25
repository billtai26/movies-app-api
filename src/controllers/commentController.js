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

const getCommentById = async (req, res, next) => {
  try {
    const id = req.params.id
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ errors: 'Invalid Comment ID format' })
    }

    const comment = await commentService.getCommentById(id)
    if (!comment) {
      return res.status(404).json({ errors: 'Comment not found' })
    }

    res.status(200).json(comment)
  } catch (error) {
    next(error)
  }
}

const updateComment = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const id = req.params.id
    const { content } = req.body

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ errors: 'Invalid Comment ID format' })
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ errors: 'content is required' })
    }

    const comment = await commentService.getCommentById(id)
    if (!comment) {
      return res.status(404).json({ errors: 'Comment not found' })
    }

    // Kiểm tra quyền: chủ bình luận hoặc admin
    if (comment.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ errors: 'Not authorized to update this comment' })
    }

    const updated = await commentService.updateComment(id, content)
    res.status(200).json(updated)
  } catch (error) {
    next(error)
  }
}

const deleteComment = async (req, res, next) => {
  try {
    const userId = req.user._id.toString()
    const id = req.params.id

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ errors: 'Invalid Comment ID format' })
    }

    const comment = await commentService.getCommentById(id)
    if (!comment) {
      return res.status(404).json({ errors: 'Comment not found' })
    }

    if (comment.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ errors: 'Not authorized to delete this comment' })
    }

    const deleted = await commentService.deleteComment(id)
    res.status(200).json(deleted)
  } catch (error) {
    next(error)
  }
}

export const commentController = {
  createComment,
  getCommentsByMovie,
  getCommentById,
  updateComment,
  deleteComment
}
