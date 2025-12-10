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

const getReports = async (fromDate, toDate) => {
  // Nếu không truyền ngày, mặc định lấy trong tháng hiện tại
  const start = fromDate ? new Date(fromDate) : new Date(new Date().setDate(1))
  const end = toDate ? new Date(toDate) : new Date()

  // Đảm bảo set giờ cuối ngày cho chính xác
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  const stats = await staffReportModel.getRevenueStats(start, end)

  return stats
}

const getStats = async (fromDate, toDate) => {
  const start = fromDate ? new Date(fromDate) : new Date(new Date().setDate(1))
  const end = toDate ? new Date(toDate) : new Date()
  start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999)

  return await staffReportModel.getRevenueStats(start, end)
}

const getAllReports = async () => {
  return await staffReportModel.getAllReports()
}

const createReport = async (data) => {
  return await staffReportModel.createNew(data)
}

export const staffReportService = {
  createNew,
  getAll,
  update,
  deleteItem,
  getReports,
  getStats,
  getAllReports,
  createReport
}
