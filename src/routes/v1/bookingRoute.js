import express from 'express'
import { bookingController } from '~/controllers/bookingController'
import { protect } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Get booking history for the authenticated user
Router.route('/history').get(protect, bookingController.getBookingHistory)

export const bookingRoute = Router