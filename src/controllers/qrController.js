import QRService from '~/services/qrService' // Đảm bảo đường dẫn đúng
import { bookingModel } from '~/models/bookingModel'
import { movieModel } from '~/models/movieModel'
import { showtimeModel } from '~/models/showtimeModel'
import { userModel } from '~/models/userModel'
import { ObjectId } from 'mongodb'
import { env } from '~/config/environment' // Import env để lấy APP_URL

export const qrController = {
  generateTicketQR: async (req, res, next) => {
    try {
      const { bookingId } = req.params

      // --- Kiểm tra định dạng ID (Đã có) ---
      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Booking ID format. Must be a 24 character hex string.'
        })
      }
      // ------------------------------------

      // Validate bookingId exists (đã có)
      // if (!bookingId) { ... } // Không cần nữa vì đã có trong params

      // Fetch booking details
      const booking = await bookingModel.findOneById(bookingId)
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        })
      }

      // --- THÊM: Kiểm tra các điều kiện để xuất hóa đơn ---
      // Ví dụ: Chỉ cho phép tạo QR/hóa đơn cho vé đã thanh toán
      if (booking.paymentStatus !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot generate invoice QR for pending or failed booking.'
        })
      }
      // (Bạn có thể thêm kiểm tra isUsed nếu cần)
      //-----------------------------------------------------


      // --- THAY ĐỔI CHÍNH: Tạo URL thay vì JSON ---
      // Tạo một URL trỏ đến API sẽ tạo PDF sau này
      // Ví dụ: http://localhost:8017/v1/bookings/6789abc.../invoice-pdf
      const invoiceUrl = `${env.APP_URL}/v1/bookings/${bookingId}/invoice-pdf`

      // Generate QR code chứa URL này
      const qrCodeDataURL = await QRService.generateQRCode(invoiceUrl) // Đổi tên biến cho rõ
      // ------------------------------------------

      // Lấy thêm thông tin liên quan để trả về khi quét mã
      const purchaser = await userModel.findOneById(booking.userId)
      const movie = await movieModel.findOneById(booking.movieId)
      const showtime = await showtimeModel.findOneById(booking.showtimeId)

      // Chuẩn hoá thông tin ghế để dễ hiển thị
      const seats = (booking.seats || []).map(s => ({
        row: s.row || null,
        number: s.number || null,
        price: s.price || null,
        label: s.row && s.number ? `${s.row}${s.number}` : null
      }))

      const responseData = {
        qrCode: qrCodeDataURL,
        bookingId: booking._id,
        invoiceUrl: invoiceUrl,
        purchaser: purchaser ? {
          id: purchaser._id,
          username: purchaser.username,
          email: purchaser.email
        } : null,
        bookingDate: booking.createdAt,
        showtime: showtime ? {
          id: showtime._id,
          startTime: showtime.startTime,
          theaterId: showtime.theaterId
        } : null,
        movie: movie ? {
          id: movie._id,
          title: movie.title
        } : null,
        seats: seats,
        totalAmount: booking.totalAmount
      }

      return res.status(200).json({
        success: true,
        data: responseData
      })
    } catch (error) {
      next(error)
    }
  },

  // Public endpoint for scanning at gate: returns minimal booking details without requiring auth
  publicGenerateTicketQR: async (req, res, next) => {
    try {
      const { bookingId } = req.params

      // Validate bookingId format
      if (!ObjectId.isValid(bookingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Booking ID format. Must be a 24 character hex string.'
        })
      }

      // Fetch booking
      const booking = await bookingModel.findOneById(bookingId)
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        })
      }

      // Only allow public scan for completed bookings (gate should only accept paid tickets)
      if (booking.paymentStatus !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Booking is not paid or not ready for entry'
        })
      }

      // Prepare minimal info for gate scanner (avoid exposing sensitive data)
      const movie = await movieModel.findOneById(booking.movieId)
      const showtime = await showtimeModel.findOneById(booking.showtimeId)

      const seats = (booking.seats || []).map(s => ({
        row: s.row || null,
        number: s.number || null,
        label: s.row && s.number ? `${s.row}${s.number}` : null
      }))

      const invoiceUrl = `${env.APP_URL}/v1/bookings/${bookingId}/invoice-pdf`

      // Optionally generate QR that points to invoiceUrl (but since this is the public scan endpoint,
      // clients may have already scanned a QR code that contains bookingId). We include no QR generation here.

      const responseData = {
        bookingId: booking._id,
        bookingDate: booking.createdAt,
        movie: movie ? { id: movie._id, title: movie.title } : null,
        showtime: showtime ? { id: showtime._id, startTime: showtime.startTime, theaterId: showtime.theaterId } : null,
        seats,
        totalAmount: booking.totalAmount,
        invoiceUrl
      }

      return res.status(200).json({
        success: true,
        data: responseData
      })
    } catch (error) {
      next(error)
    }
  }
}