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

export const staffReportController = {
  createNew,
  getAll,
  update,
  deleteItem
}
