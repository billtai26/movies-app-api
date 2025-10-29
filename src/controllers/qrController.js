import QRService from '~/services/qrService' // Đảm bảo đường dẫn đúng
import { bookingModel } from '~/models/bookingModel'
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

      return res.status(200).json({
        success: true,
        data: {
          qrCode: qrCodeDataURL, // Trả về QR code dạng data URL
          bookingId: booking._id,
          invoiceUrl: invoiceUrl // (Tùy chọn) Trả về cả URL để debug
        }
      })
    } catch (error) {
      next(error)
    }
  }
}