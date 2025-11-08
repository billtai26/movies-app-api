import { bookingModel } from '~/models/bookingModel'
import PDFService from '~/services/pdfService'
import { movieModel } from '~/models/movieModel'
import { showtimeModel } from '~/models/showtimeModel'
import { ObjectId } from 'mongodb'
import { bookingService } from '~/services/bookingService'

export const bookingController = {
  getBookingHistory: async (req, res) => {
    try {
      const userId = req.user._id // Lấy userId từ middleware xác thực

      // Lấy danh sách lịch sử đặt vé của user
      const bookings = await bookingModel.getBookingsByUserId(userId)

      return res.status(200).json({
        success: true,
        data: bookings
      })
    } catch (error) {
      // console.error('Error fetching booking history:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch booking history',
        error: error.message
      })
    }
  },
  printTicket: async (req, res) => {
    try {
      const { bookingId } = req.params

      // Validate bookingId
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        })
      }

      // Fetch booking details
      const booking = await bookingModel.findOneById(bookingId)
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        })
      }

      // Generate ticket details
      const ticketDetails = {
        bookingId: booking._id,
        userId: booking.userId,
        showtimeId: booking.showtimeId,
        movieId: booking.movieId,
        seats: booking.seats,
        totalAmount: booking.totalAmount,
        createdAt: booking.createdAt
      }

      // Simulate printing ticket (you can integrate with a real printer here)
      // console.log('Printing ticket:', ticketDetails)

      return res.status(200).json({
        success: true,
        message: 'Ticket printed successfully',
        data: ticketDetails
      })
    } catch (error) {
      // console.error('Error printing ticket:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to print ticket',
        error: error.message
      })
    }
  },

  generateInvoicePDF: async (req, res, next) => {
    try {
      const { id: bookingId } = req.params

      // Validate bookingId
      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID is required'
        })
      }

      // Fetch booking details
      const booking = await bookingModel.findOneById(bookingId)
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        })
      }

      // Verify that the user requesting the invoice is the booking owner
      // if (booking.userId.toString() !== req.user._id.toString()) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'You are not authorized to access this invoice'
      //   })
      // }

      // Get movie and showtime details
      // Lấy chi tiết phim từ movieModel
      const movieDetails = await movieModel.findOneById(booking.movieId)
      // Lấy chi tiết suất chiếu từ showtimeModel
      const showtimeDetails = await showtimeModel.findOneById(booking.showtimeId)

      // Generate PDF
      const pdfBuffer = await PDFService.generateInvoicePDF(booking, movieDetails, showtimeDetails)

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment filename=invoice-${bookingId}.pdf`)

      // Send the PDF
      return res.send(pdfBuffer)
    } catch (error) {
      // return res.status(500).json({
      //   success: false,
      //   message: 'Failed to generate invoice PDF',
      //   error: error.message
      // })
      // Chuyển lỗi cho middleware xử lý lỗi
      next(error)
    }
  },

  // PUT /v1/bookings/:id/verify
  verifyTicketAtCounter: async (req, res) => {
    try {
      const { id: bookingId } = req.params
      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({ errors: 'Invalid Booking ID' })
      }

      const verifiedBooking = await bookingService.verifyAndUseTicket(bookingId)
      res.status(200).json(verifiedBooking)
    } catch (error) {
      res.status(400).json({ errors: error.message })
    }
  },

  // PUT /v1/bookings/:id/cancel
  cancelBooking: async (req, res) => {
    try {
      const userId = req.user._id // Lấy từ 'protect'
      const { id: bookingId } = req.params

      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({ errors: 'Invalid Booking ID' })
      }

      const result = await bookingService.cancelBooking(userId, bookingId)
      res.status(200).json(result)
    } catch (error) {
      // Trả về lỗi 400 (Bad Request) cho các lỗi nghiệp vụ
      res.status(400).json({ errors: error.message })
    }
  },

  // HÀM MỚI: (Admin) Cập nhật booking
  updateBooking: async (req, res, next) => {
    try {
      const { id: bookingId } = req.params
      const updateData = req.body // Dữ liệu đã được validation lọc

      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({ errors: 'Invalid Booking ID' })
      }

      const result = await bookingService.updateBooking(bookingId, updateData)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  // PUT /v1/bookings/:id/exchange (User)
  exchangeTicket: async (req, res) => {
    try {
      const userId = req.user._id
      const { id: originalBookingId } = req.params
      const { newShowtimeId, newSeats } = req.body

      if (!ObjectId.isValid(originalBookingId) || !ObjectId.isValid(newShowtimeId)) {
        return res.status(400).json({ errors: 'Invalid Booking or Showtime ID format' })
      }

      const result = await bookingService.exchangeTicket(userId, originalBookingId, newShowtimeId, newSeats)
      res.status(200).json(result)
    } catch (error) {
      res.status(400).json({ errors: error.message })
    }
  },

  // HÀM MỚI: (Admin) Đổi ghế tại quầy
  changeSeatsAtCounter: async (req, res) => {
    try {
      const { id: bookingId } = req.params
      const { oldSeats, newSeats } = req.body

      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({ errors: 'Invalid Booking ID format' })
      }

      const result = await bookingService.changeSeatsAtCounter(
        bookingId,
        oldSeats,
        newSeats
      )
      res.status(200).json(result)
    } catch (error) {
      // Chuyển lỗi nghiệp vụ (ví dụ: ghế đã bị chiếm)
      res.status(400).json({ errors: error.message })
    }
  },

  /**
   * HÀM MỚI: (Admin) GET /
   */
  adminGetBookings: async (req, res, next) => {
    try {
      const result = await bookingService.adminGetBookings(req.query)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  /**
   * HÀM MỚI: (Admin) GET /:id
   */
  adminGetBookingDetails: async (req, res, next) => {
    try {
      const booking = await bookingService.adminGetBookingDetails(req.params.id)
      res.status(200).json(booking)
    } catch (error) {
      next(error)
    }
  },

  /**
   * HÀM MỚI: (Admin) DELETE /:id
   */
  adminDeleteBooking: async (req, res, next) => {
    try {
      const result = await bookingService.adminDeleteBooking(req.params.id)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }
}