import express from 'express'
import { qrController } from '~/controllers/qrController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Generate QR code for a booking
Router.route('/ticket/:bookingId').get(protect, qrController.generateTicketQR)

// Public scan endpoint (no auth) for gate scanners
Router.route('/public/ticket/:bookingId').get(qrController.publicGenerateTicketQR)

export const qrRoute = Router