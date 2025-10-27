import QRService from '~/services/qrService'
import { bookingModel } from '~/models/bookingModel'
import { ObjectId } from 'mongodb'

export const qrController = {
  generateTicketQR: async (req, res, next) => {
    try {
      const { bookingId } = req.params

      // --- THÊM BƯỚC KIỂM TRA ĐỊNH DẠNG ID ---
      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Booking ID format. Must be a 24 character hex string.'
        })
      }
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
      // console.error('Error generating QR code:', error)
      // Chuyển lỗi cho middleware xử lý lỗi tập trung thay vì trả về 500 trực tiếp
      next(error)
    }
  }
}