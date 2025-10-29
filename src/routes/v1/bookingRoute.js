import express from 'express'
import { bookingController } from '~/controllers/bookingController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Get booking history for the authenticated user
Router.route('/history').get(protect, bookingController.getBookingHistory)

// Print ticket at the counter
Router.route('/print/:bookingId').get(protect, bookingController.printTicket)

// Generate invoice PDF
Router.route('/:id/invoice-pdf').get(bookingController.generateInvoicePDF)

export const bookingRoute = Router