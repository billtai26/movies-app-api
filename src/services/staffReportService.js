import { staffReportModel } from '~/models/staffReportModel'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

const createNew = async (reqBody) => {
  const createdItem = await staffReportModel.createNew(reqBody)
  const getNewItem = await staffReportModel.findOneById(createdItem.insertedId)
  return getNewItem
}

const getAll = async () => {
  // Có thể thêm logic filter/pagination ở đây nếu cần
  return await staffReportModel.getAll()
}

const update = async (id, reqBody) => {
  const updatedItem = await staffReportModel.update(id, reqBody)
  if (!updatedItem) throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found!')
  return updatedItem
}

const deleteItem = async (id) => {
  const targetItem = await staffReportModel.findOneById(id)
  if (!targetItem) throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found!')

  await staffReportModel.deleteItem(id)
  return { message: 'Deleted successfully!' }
}

export const staffReportService = {
  createNew,
  getAll,
  update,
  deleteItem
}
