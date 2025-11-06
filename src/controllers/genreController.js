import { genreService } from '~/services/genreService'

/**
 * 1. POST / (Admin)
 */
const createNew = async (req, res) => {
  try {
    const createdGenre = await genreService.createNew(req.body)
    res.status(201).json(createdGenre)
  } catch (error) {
    // Bắt lỗi trùng tên từ service
    res.status(400).json({ errors: error.message })
  }
}

/**
 * 2. PATCH /:id (Admin)
 */
const updateGenre = async (req, res) => {
  try {
    const genreId = req.params.id
    const updatedGenre = await genreService.updateGenre(genreId, req.body)
    res.status(200).json(updatedGenre)
  } catch (error) {
    res.status(400).json({ errors: error.message })
  }
}

/**
 * 3. DELETE /:id (Admin)
 */
const deleteGenre = async (req, res) => {
  try {
    const genreId = req.params.id
    const result = await genreService.deleteGenre(genreId)
    res.status(200).json(result)
  } catch (error) {
    res.status(404).json({ errors: error.message }) // 404 nếu không tìm thấy
  }
}

/**
 * 4. GET /:id (Public)
 */
const getGenreDetails = async (req, res) => {
  try {
    const genre = await genreService.getGenreDetails(req.params.id)
    res.status(200).json(genre)
  } catch (error) {
    res.status(404).json({ errors: error.message }) // 404 nếu không tìm thấy
  }
}

/**
 * 5. GET / (Public - Lọc, Tìm, Phân trang)
 */
const getGenres = async (req, res, next) => {
  try {
    const result = await genreService.getGenres(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const genreController = {
  createNew,
  updateGenre,
  deleteGenre,
  getGenreDetails,
  getGenres
}