import express from 'express'
import { qrController } from '~/controllers/qrController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Generate QR code for a booking
Router.route('/ticket/:bookingId').get(protect, qrController.generateTicketQR)

export const qrRoute = Router