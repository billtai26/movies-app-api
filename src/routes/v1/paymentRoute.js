import express from 'express'
import { paymentController } from '~/controllers/paymentController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Initialize payment
Router.route('/momo/payment')
  .post(protect, paymentController.initializePayment)

// Handle payment callback from MoMo
Router.route('/momo/callback')
  .post(paymentController.handlePaymentCallback)

export const paymentRoute = Router