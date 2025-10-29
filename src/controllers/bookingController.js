import { bookingModel } from '~/models/bookingModel'
import PDFService from '~/services/pdfService'
import { movieModel } from '~/models/movieModel'
import { showtimeModel } from '~/models/showtimeModel'

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
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${bookingId}.pdf`)

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
  }
}