import express from 'express'
import { paymentController } from '~/controllers/paymentController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// POST /v1/payments/momo/payment
Router.post('/momo/payment', protect, paymentController.initializePayment)

// POST /v1/payments/momo/callback  (ipnUrl của MoMo)
Router.post('/momo/callback', paymentController.handlePaymentCallback)

export const paymentRoute = Router