import QRService from '~/services/qrService'
import { bookingModel } from '~/models/bookingModel'

export const qrController = {
  generateTicketQR: async (req, res) => {
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

      // Generate QR code data
      const qrData = {
        bookingId: booking._id,
        userId: booking.userId,
        showtimeId: booking.showtimeId,
        seats: booking.seats,
        totalAmount: booking.totalAmount
      }

      // Convert QR data to string
      const qrString = JSON.stringify(qrData)

      // Generate QR code
      const qrCode = await QRService.generateQRCode(qrString)

      return res.status(200).json({
        success: true,
        data: {
          qrCode,
          bookingId: booking._id
        }
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        error: error.message
      })
    }
  }
}