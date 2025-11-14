import { movieService } from '~/services/movieService'
import { uploadService } from '~/services/uploadService' // <-- IMPORT UPLOAD SERVICE
import { ApiError } from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  try {
    const createdMovie = await movieService.createNew(req.body)
    res.status(201).json(createdMovie)
  } catch (error) {
    // next(error) để chuyển cho middleware xử lý lỗi tập trung
    next(error)
  }
}

const getMovies = async (req, res, next) => {
  try {
    // Lấy query parameters từ URL, ví dụ: /v1/movies?status=now_showing
    const movies = await movieService.getMovies(req.query)
    res.status(200).json(movies)
  } catch (error) {
    next(error)
  }
}

const getMovieDetails = async (req, res, next) => {
  try {
    const movie = await movieService.getMovieDetails(req.params.id)
    res.status(200).json(movie)
  } catch (error) {
    next(error)
  }
}

const updateMovie = async (req, res, next) => {
  try {
    const movieId = req.params.id
    const updatedMovie = await movieService.updateMovie(movieId, req.body)
    res.status(200).json(updatedMovie)
  } catch (error) {
    next(error)
  }
}

const deleteMovie = async (req, res, next) => {
  try {
    const movieId = req.params.id
    await movieService.deleteMovie(movieId)
    res.status(200).json({ message: 'Movie soft deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const updateMoviePoster = async (req, res, next) => {
  try {
    // 1. Kiểm tra file
    if (!req.file) {
      throw new ApiError(400, 'No poster file provided')
    }

    // 2. Lấy ID phim từ URL
    const movieId = req.params.id

    // 3. Upload lên Cloudinary
    const { url } = await uploadService.uploadFileToCloudinary(
      req.file.buffer,
      'posters' // <-- Tên thư mục trên Cloudinary
    )

    // 4. Lưu URL mới vào movie (Tái sử dụng hàm updateMovie)
    const updatedMovie = await movieService.updateMovie(movieId, { posterUrl: url })

    res.status(200).json(updatedMovie)
  } catch (error) {
    next(error)
  }
}

export const movieController = {
  createNew,
  getMovies,
  getMovieDetails,
  updateMovie,
  deleteMovie,
  updateMoviePoster
}
