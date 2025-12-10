import express from 'express'
import { staffReportController } from '~/controllers/staffReportController'
import { staffReportValidation } from '~/validations/staffReportValidation'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// 1. Route lấy thống kê (đặt trước route / để tránh nhầm lẫn)
Router.route('/stats').get(protect, staffReportController.getStats)

Router.route('/')
  .get(protect, staffReportController.getReports)
  .get(staffReportController.getAll)
  .post(staffReportValidation.createNew, staffReportController.createNew)

Router.route('/:id')
  .put(staffReportController.update)
  .delete(staffReportController.deleteItem)

export const staffReportRoute = Router
