import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.route('/register')
  .post(userValidation.register, userController.register)

Router.route('/login')
  .post(userValidation.login, userController.login)

// ROUTE MỚI ĐỂ XÁC THỰC EMAIL
Router.route('/verify-email/:token')
  .get(userController.verifyEmail) // Dùng GET vì người dùng chỉ cần nhấp vào link

Router.route('/profile')
  .get(protect, userController.getUserProfile)

// ROUTE MỚI
Router.route('/forgot-password')
  .post(userValidation.forgotPassword, userController.forgotPassword)

// ROUTE MỚI
Router.route('/reset-password/:resetToken')
  .put(userValidation.resetPassword, userController.resetPassword) // Dùng PUT vì ta đang cập nhật resource

export const userRoute = Router
