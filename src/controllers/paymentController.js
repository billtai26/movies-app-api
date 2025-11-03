import MomoService from '~/services/momoService'
import { bookingModel } from '~/models/bookingModel'
import { userModel } from '~/models/userModel' // <-- IMPORT userModel
import { voucherService } from '~/services/voucherService' // <-- IMPORT voucherService
import { voucherModel } from '~/models/voucherModel'
import { notificationService } from '~/services/notificationService'
import { movieModel } from '~/models/movieModel' // Để lấy tên phim
import { env } from '~/config/environment' // Để lấy URL frontend
import { showtimeModel } from '~/models/showtimeModel'

export const paymentController = {
  initializePayment: async (req, res) => {
    try {
      const {
        showtimeId,
        movieId,
        seats,
        combos = [],
        amount, // Đây là giá GỐC (trước khi giảm)
        pointsToSpend = 0, // User muốn tiêu (mặc định là 0)
        voucherCode = null // User muốn dùng (mặc định là null)
      } = req.body

      // Validate required fields
      if (!showtimeId || !movieId || !seats || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: showtimeId, movieId, seats, amount'
        })
      }

      // Get user ID from auth middleware
      const userId = req.user._id

      // Chuyển ObjectId thành String TRƯỚC KHI tạo bookingData
      const userIdString = userId.toString()

      // Check seat availability
      const seatAvailability = await bookingModel.checkSeatAvailability(showtimeId, seats)
      if (!seatAvailability.available) {
        return res.status(400).json({
          success: false,
          message: 'Some seats are already booked',
          conflictingSeats: seatAvailability.conflictingSeats
        })
      }

      // --- LOGIC TÍNH TOÁN GIẢM GIÁ ---
      let originalAmount = amount
      let finalAmount = originalAmount
      let discountAmount = 0
      let pointsDiscount = 0
      let appliedVoucher = null

      // 1. Áp dụng Voucher (nếu có)
      if (voucherCode) {
        const voucherResult = await voucherService.applyVoucher(voucherCode, finalAmount)
        if (voucherResult.error) {
          return res.status(400).json({ success: false, message: voucherResult.error })
        }
        finalAmount = voucherResult.finalAmount
        discountAmount = voucherResult.discount
        appliedVoucher = voucherResult.voucher
      }

      // 2. Áp dụng Điểm (nếu có)
      if (pointsToSpend > 0) {
        const user = await userModel.findOneById(userId)
        if (pointsToSpend > user.loyaltyPoints) {
          return res.status(400).json({ success: false, message: 'Not enough loyalty points.' })
        }
        // Giả sử 1 điểm = 1 VND
        pointsDiscount = Math.min(finalAmount, pointsToSpend) // Không cho giảm quá số tiền còn lại
        finalAmount = Math.max(0, finalAmount - pointsDiscount)
      }
      // --- KẾT THÚC TÍNH TOÁN ---

      // Create new booking
      const bookingData = {
        userId: userIdString,
        showtimeId,
        movieId,
        seats,
        combos,
        originalAmount: originalAmount, // <-- LƯU GIÁ GỐC
        totalAmount: finalAmount, // <-- LƯU GIÁ CUỐI CÙNG
        discountAmount: discountAmount, // <-- LƯU GIẢM GIÁ
        pointsSpent: pointsDiscount, // <-- LƯU ĐIỂM ĐÃ TIÊU
        voucherCode: voucherCode, // <-- LƯU MÃ VOUCHER
        paymentMethod: 'momo',
        paymentStatus: 'pending',
        bookingStatus: 'active'
      }

      const newBooking = await bookingModel.createNew(bookingData)
      const bookingId = newBooking.insertedId

      // Create payment with MoMo
      const orderInfo = `Booking_${bookingId}_MovieTickets`
      const paymentResponse = await MomoService.createPayment(finalAmount, orderInfo)

      if (paymentResponse.resultCode !== 0) {
        // If MoMo payment initialization fails, cancel the booking
        await bookingModel.cancelBooking(bookingId) // Hủy booking nếu MoMo lỗi
        return res.status(400).json({
          success: false,
          message: 'Failed to initialize MoMo payment',
          error: paymentResponse.message
        })
      }

      // --- TRỪ ĐIỂM VÀ TĂNG LƯỢT DÙNG VOUCHER ---
      // Chỉ thực hiện sau khi tạo đơn hàng thành công
      if (pointsDiscount > 0) {
        await userModel.addLoyaltyPoints(userId, -pointsDiscount) // Trừ điểm
      }
      if (appliedVoucher) {
        await voucherModel.incrementUsage(appliedVoucher._id) // Tăng lượt dùng voucher
      }
      // ----------------------------------------

      return res.status(200).json({
        success: true,
        data: {
          bookingId: newBooking.insertedId,
          paymentUrl: paymentResponse.payUrl,
          amount: finalAmount, // Trả về số tiền cần thanh toán
          originalAmount: originalAmount,
          discount: discountAmount + pointsDiscount,
          orderInfo: orderInfo
        }
      })
    } catch (error) {
      // console.error('Error initializing MoMo payment:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        error: error.message
      })
    }
  },

  handlePaymentCallback: async (req, res) => {
    try {
      // 1. Xác thực MoMo
      const paymentResult = await MomoService.handlePaymentCallback(req.body)

      // 2. Trích xuất bookingId
      let bookingId = null
      if (paymentResult && paymentResult.orderInfo) {
        const parts = paymentResult.orderInfo.split('_')
        if (parts.length >= 2) bookingId = parts[1]
      }

      let invoice = null
      if (bookingId) {
        const paymentStatus = paymentResult.success ? 'completed' : 'failed'

        // 3. Cập nhật trạng thái thanh toán
        const updatedBooking = await bookingModel.updatePaymentStatus(
          bookingId,
          paymentStatus,
          paymentResult.transactionId
        )

        // 4. CHỈ CHẠY LOGIC NẾU THANH TOÁN THÀNH CÔNG
        if (paymentStatus === 'completed' && updatedBooking) {
          // --- 5. ĐOẠN CODE BỊ THIẾU CẦN THÊM VÀO ---
          // Chuyển đổi định dạng ghế từ object (trong booking) sang string (trong showtime)
          // Ví dụ: [{ row: 'B', number: 1 }] -> ['B1']
          const seatNumbers = updatedBooking.seats.map(seat => `${seat.row}${seat.number}`)

          // Cập nhật collection 'showtimes'
          await showtimeModel.updateSeatsStatus(
            updatedBooking.showtimeId,
            seatNumbers, // Truyền mảng đã chuyển đổi
            'booked',
            null,
            null
          )
          // -------------------------------------------

          // 6. Gửi thông báo
          const movie = await movieModel.findOneById(updatedBooking.movieId)
          const frontendBookingUrl = `${env.APP_URL_FRONTEND || 'http://your-frontend-url.com'}/my-tickets/${bookingId}`
          await notificationService.createNotification(
            updatedBooking.userId.toString(),
            'ticket',
            'Mua vé thành công!',
            `Vé của bạn cho phim "${movie ? movie.title : 'Phim'}" đã được xác nhận.`,
            frontendBookingUrl,
            true
          )

          // 7. Cộng điểm tích lũy
          // (Lưu ý: bookingModel.updatePaymentStatus đã trả về updatedBooking, ta không cần gọi findOneById)
          if (paymentResult.success && updatedBooking) {
            const pointsEarned = Math.floor(updatedBooking.totalAmount * 0.1)
            if (pointsEarned > 0) {
              await userModel.addLoyaltyPoints(updatedBooking.userId, pointsEarned)
            }
          }

          // 8. Tạo hóa đơn
          invoice = {
            bookingId: updatedBooking._id,
            userId: updatedBooking.userId,
            showtimeId: updatedBooking.showtimeId,
            movieId: updatedBooking.movieId,
            seats: updatedBooking.seats,
            combos: updatedBooking.combos || [],
            totalAmount: updatedBooking.totalAmount,
            paymentStatus: updatedBooking.paymentStatus,
            createdAt: updatedBooking.createdAt
          }
        }
      }

      // 9. Trả về phản hồi cho MoMo
      return res.status(200).json({
        partnerCode: req.body.partnerCode,
        orderId: req.body.orderId,
        requestId: req.body.requestId,
        amount: req.body.amount,
        orderInfo: req.body.orderInfo,
        orderType: req.body.orderType,
        transId: req.body.transId,
        resultCode: paymentResult.success ? 0 : 1,
        message: paymentResult.message,
        responseTime: Date.now(),
        extraData: req.body.extraData || '',
        invoice
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process payment callback',
        error: error.message
      })
    }
  }
}
