import { StatusCodes } from 'http-status-codes'
import { staffReportService } from '~/services/staffReportService'

const createNew = async (req, res, next) => {
  try {
    const createdReport = await staffReportService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(createdReport)
  } catch (error) { next(error) }
}

const getAll = async (req, res, next) => {
  try {
    const reports = await staffReportService.getAll()
    res.status(StatusCodes.OK).json(reports)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const updatedReport = await staffReportService.update(req.params.id, req.body)
    res.status(StatusCodes.OK).json(updatedReport)
  } catch (error) { next(error) }
}

const deleteItem = async (req, res, next) => {
  try {
    await staffReportService.deleteItem(req.params.id)
    res.status(StatusCodes.OK).json({ message: 'Deleted successfully' })
  } catch (error) { next(error) }
}

const getReports = async (req, res, next) => {
  try {
    // Lấy query params từ frontend (ví dụ: ?fromDate=...&toDate=...)
    const { fromDate, toDate } = req.query

    const reportData = await staffReportService.getReports(fromDate, toDate)

    res.status(200).json(reportData)
  } catch (error) {
    next(error)
  }
}

// Controller lấy thống kê
const getStats = async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query
    const stats = await staffReportService.getStats(fromDate, toDate)
    res.status(200).json(stats)
  } catch (error) { next(error) }
}

// Controller lấy danh sách báo cáo
const getAllReports = async (req, res, next) => {
  try {
    const reports = await staffReportService.getAllReports()
    res.status(200).json(reports)
  } catch (error) { next(error) }
}

// Controller tạo báo cáo mới
const createReport = async (req, res, next) => {
  try {
    const newReport = await staffReportService.createReport(req.body)
    res.status(201).json(newReport)
  } catch (error) { next(error) }
}

export const staffReportController = {
  createNew,
  getAll,
  update,
  deleteItem,
  getReports,
  getStats,
  getAllReports,
  createReport
}
