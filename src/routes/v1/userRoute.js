import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/register')
  .post(userValidation.register, userController.register)

Router.route('/login')
  .post(userValidation.login, userController.login)

Router.route('/profile')
  .get(protect, userController.getUserProfile)

export const userRoute = Router
