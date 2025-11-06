import { movieModel } from '~/models/movieModel'

// Tạm thời chúng ta sẽ tạo API để thêm phim, sau này có thể phân quyền cho admin
const createNew = async (reqBody) => {
  // Logic nghiệp vụ (nếu có)
  const newMovie = {
    ...reqBody,
    releaseDate: new Date(reqBody.releaseDate) // Chuyển đổi string sang Date object
  }
  const createdMovie = await movieModel.createNew(newMovie)
  return await movieModel.findOneById(createdMovie.insertedId)
}

// CẬP NHẬT HÀM NÀY
const getMovies = async (queryParams) => {
  try {
    // 1. Trích xuất các tham số filter (đã có)
    const { status, q, genre } = queryParams
    const filters = { status, q, genre }

    // 2. Trích xuất tham số phân trang
    const page = parseInt(queryParams.page) || 1
    const limit = parseInt(queryParams.limit) || 10
    const skip = (page - 1) * limit

    const pagination = { page, limit, skip }

    // 3. Truyền cả filter và pagination xuống model
    return await movieModel.getAll(filters, pagination)

  } catch (error) { throw new Error(error) }
}

const getMovieDetails = async (movieId) => {
  const movie = await movieModel.findOneById(movieId)
  if (!movie) throw new Error('Movie not found')
  return movie
}

const updateMovie = async (movieId, updateData) => {
  try {
    // Nếu releaseDate được gửi lên, chuyển nó thành Date object
    if (updateData.releaseDate) {
      updateData.releaseDate = new Date(updateData.releaseDate)
    }

    const updatedMovie = await movieModel.update(movieId, updateData)
    if (!updatedMovie) {
      throw new Error('Movie not found or update failed')
    }
    return updatedMovie
  } catch (error) { throw new Error(error) }
}

const deleteMovie = async (movieId) => {
  try {
    const result = await movieModel.softDelete(movieId)
    if (!result) {
      throw new Error('Movie not found or already deleted')
    }
    // (Trong tương lai: có thể xoá luôn các showtime liên quan...)
    return result
  } catch (error) { throw new Error(error) }
}

export const movieService = {
  createNew,
  getMovies,
  getMovieDetails,
  updateMovie,
  deleteMovie
}
