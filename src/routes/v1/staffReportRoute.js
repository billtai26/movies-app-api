import express from 'express'
import { staffReportController } from '~/controllers/staffReportController'
import { staffReportValidation } from '~/validations/staffReportValidation'

const Router = express.Router()

Router.route('/')
  .get(staffReportController.getAll)
  .post(staffReportValidation.createNew, staffReportController.createNew)

Router.route('/:id')
  .put(staffReportController.update)
  .delete(staffReportController.deleteItem)

export const staffReportRoute = Router
