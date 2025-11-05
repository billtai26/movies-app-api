import express from 'express'
import { bookingController } from '~/controllers/bookingController'
import { protect } from '~/middlewares/authMiddleware'
import { bookingValidation } from '~/validations/bookingValidation'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// Get booking history for the authenticated user
Router.route('/history').get(protect, bookingController.getBookingHistory)

// Print ticket at the counter
Router.route('/print/:bookingId').get(protect, bookingController.printTicket)

// Generate invoice PDF
Router.route('/:id/invoice-pdf').get(bookingController.generateInvoicePDF)

Router.route('/:id/cancel')
  .put(protect, bookingController.cancelBooking)

// 6. PATCH Chỉnh sửa (Admin)
Router.route('/:id')
  .patch(
    protect,
    admin,
    bookingValidation.updateBooking, // <-- 2. THÊM ROUTE MỚI
    bookingController.updateBooking
  )

// 7. PUT Đổi vé (User) <-- THÊM ROUTE MỚI
Router.route('/:id/exchange')
  .put(
    protect,
    bookingValidation.exchangeTicket,
    bookingController.exchangeTicket
  )

// 8. POST Đổi ghế tại quầy (Admin/Nhân viên)
Router.route('/:id/change-seats-at-counter')
  .post(
    protect,
    admin,
    bookingValidation.changeSeatsAtCounter, // Validation mới
    bookingController.changeSeatsAtCounter // Controller mới
  )

export const bookingRoute = Router