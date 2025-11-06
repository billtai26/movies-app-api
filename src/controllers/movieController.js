import { movieService } from '~/services/movieService'

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

export const movieController = {
  createNew,
  getMovies,
  getMovieDetails,
  updateMovie,
  deleteMovie
}
