import { genreModel } from '~/models/genreModel'

/**
 * 1. Thêm thể loại mới
 */
const createNew = async (reqBody) => {
  try {
    const { name, description } = reqBody

    // Kiểm tra nghiệp vụ: Tên thể loại không được trùng
    const existingGenre = await genreModel.findByName(name)
    if (existingGenre) {
      throw new Error('Genre name already exists')
    }

    const newGenreData = { name, description }
    const createdGenre = await genreModel.createNew(newGenreData)

    // Trả về dữ liệu đầy đủ sau khi tạo
    return await genreModel.findOneById(createdGenre.insertedId)
  } catch (error) { throw new Error(error.message) }
}

/**
 * 2. Sửa thể loại
 */
const updateGenre = async (genreId, updateData) => {
  try {
    // Nếu admin cập nhật tên, phải kiểm tra trùng
    if (updateData.name) {
      const existingGenre = await genreModel.findByName(updateData.name)
      // Nếu tồn tại genre khác có tên này (khác ID hiện tại) -> Lỗi
      if (existingGenre && existingGenre._id.toString() !== genreId) {
        throw new Error('Genre name already exists')
      }
    }

    const updatedGenre = await genreModel.update(genreId, updateData)
    if (!updatedGenre) {
      throw new Error('Genre not found or update failed')
    }
    return updatedGenre
  } catch (error) { throw new Error(error.message) }
}

/**
 * 3. Xoá mềm thể loại
 */
const deleteGenre = async (genreId) => {
  try {
    const genre = await genreModel.findOneById(genreId)
    if (!genre) {
      throw new Error('Genre not found')
    }

    // (Logic nâng cao: Kiểm tra xem thể loại này có đang được sử dụng không...)
    // Hiện tại, movie.genres là mảng string, nên việc xoá mềm genre là an toàn,
    // nó chỉ ngăn không cho thêm vào phim mới.

    await genreModel.softDelete(genreId)
    return { message: 'Genre soft deleted successfully' }
  } catch (error) { throw new Error(error.message) }
}

/**
 * 4. Lấy chi tiết
 */
const getGenreDetails = async (genreId) => {
  const genre = await genreModel.findOneById(genreId)
  if (!genre) throw new Error('Genre not found')
  return genre
}

/**
 * 5. Lấy danh sách (Lọc, Tìm kiếm, Phân trang)
 */
const getGenres = async (queryParams) => {
  try {
    // 1. Trích xuất filter
    const { q } = queryParams
    const filters = { q }

    // 2. Trích xuất phân trang
    const page = parseInt(queryParams.page) || 1
    const limit = parseInt(queryParams.limit) || 10
    const skip = (page - 1) * limit
    const pagination = { page, limit, skip }

    // 3. Gọi Model
    return await genreModel.getAll(filters, pagination)

  } catch (error) { throw new Error(error) }
}


export const genreService = {
  createNew,
  updateGenre,
  deleteGenre,
  getGenreDetails,
  getGenres
}