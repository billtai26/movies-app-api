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
    // Trích xuất cả status và q từ queryParams
    const { status, q } = queryParams

    // Truyền cả hai tham số xuống model
    return await movieModel.getAll({ status, q })

  } catch (error) { throw new Error(error) }
}

const getMovieDetails = async (movieId) => {
  const movie = await movieModel.findOneById(movieId)
  if (!movie) throw new Error('Movie not found')
  return movie
}

export const movieService = {
  createNew,
  getMovies,
  getMovieDetails
}
