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

const getMovies = async (queryParams) => {
  // queryParams sẽ chứa các bộ lọc, ví dụ: { status: 'now_showing' }
  return await movieModel.getAll(queryParams)
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
