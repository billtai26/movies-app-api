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
    // Trích xuất các tham số từ queryParams (bao gồm cả 'genre')
    const { status, q, genre } = queryParams

    // Truyền tất cả các tham số xuống model
    // Express tự động xử lý ?genre=Action&genre=Drama thành mảng ['Action', 'Drama']
    return await movieModel.getAll({ status, q, genre })

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
