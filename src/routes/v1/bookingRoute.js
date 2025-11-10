import express from 'express'
import { bookingController } from '~/controllers/bookingController'
import { protect } from '~/middlewares/authMiddleware'
import { bookingValidation } from '~/validations/bookingValidation'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// HÀM MỚI: (Admin) Lấy danh sách, lọc, phân trang
// GET /v1/bookings?userId=...&date=2025-11-10&paymentStatus=completed
Router.route('/')
  .get(protect, admin, bookingController.adminGetBookings)

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
  .get(protect, admin, bookingController.adminGetBookingDetails)
  .patch(
    protect,
    admin,
    bookingValidation.updateBooking, // <-- 2. THÊM ROUTE MỚI
    bookingController.updateBooking
  )
  .delete(protect, admin, bookingController.adminDeleteBooking)

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

// 9. PATCH Thêm combo tại quầy (Admin/Nhân viên)
Router.route('/:id/add-combos')
  .patch(
    protect,
    admin,
    bookingValidation.addCombosAtCounter, // Validation mới
    bookingController.addCombosAtCounter // Controller mới
  )

// 10. PUT Xác minh vé (Quét QR) (Admin/Nhân viên)
Router.route('/:id/verify')
  .put(
    protect,
    admin,
    bookingController.verifyTicketAtCounter // <-- Hàm controller đã có sẵn
  )

export const bookingRoute = Router