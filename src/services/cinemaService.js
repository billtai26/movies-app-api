import { cinemaModel } from '~/models/cinemaModel'
import { cinemaHallModel } from '~/models/cinemaHallModel'
import { ApiError } from '~/utils/ApiError'

const createNew = async (reqBody) => {
  // Bỏ try...catch
  const existingCinema = await cinemaModel.findByName(reqBody.name)
  if (existingCinema) {
    // Ném ApiError để controller bắt
    throw new ApiError(400, 'Cinema name already exists')
  }

  const createdCinema = await cinemaModel.createNew(reqBody)
  return await cinemaModel.findOneById(createdCinema.insertedId)
}

const updateCinema = async (cinemaId, updateData) => {
  // Bỏ try...catch
  if (updateData.name) {
    const existingCinema = await cinemaModel.findByName(updateData.name)
    if (existingCinema && existingCinema._id.toString() !== cinemaId) {
      throw new ApiError(400, 'Cinema name already exists')
    }
  }

  const updatedCinema = await cinemaModel.update(cinemaId, updateData)
  if (!updatedCinema) {
    throw new ApiError(404, 'Cinema not found or update failed')
  }
  return updatedCinema
}

const deleteCinema = async (cinemaId) => {
  // Bỏ try...catch
  const cinema = await cinemaModel.findOneById(cinemaId)
  if (!cinema) {
    throw new ApiError(404, 'Cinema not found')
  }

  const hasHalls = await cinemaHallModel.findHallsByCinema(cinemaId)
  if (hasHalls && hasHalls.length > 0) {
    throw new ApiError(400, 'Cannot delete cinema: It still contains cinema halls.')
  }

  await cinemaModel.softDelete(cinemaId)
  return { message: 'Cinema soft deleted successfully' }
}

const getCinemaDetails = async (cinemaId) => {
  // Hàm này đã đúng (vì không có try...catch)
  const cinema = await cinemaModel.findOneById(cinemaId)
  if (!cinema) {
    throw new ApiError(404, 'Cinema not found')
  }
  return cinema
}

const getCinemas = async (queryParams) => {
  // Bỏ try...catch, getAll của model đã tự xử lý lỗi
  const { q, city, page, limit } = queryParams
  const filters = { q, city }

  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 10
  const skip = (pageNum - 1) * limitNum
  const pagination = { page: pageNum, limit: limitNum, skip }

  return await cinemaModel.getAll(filters, pagination)
}

export const cinemaService = {
  createNew,
  updateCinema,
  deleteCinema,
  getCinemaDetails,
  getCinemas
}
