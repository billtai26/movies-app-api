// src/controllers/paymentController.js
import MomoService from '~/services/momoService'
import { bookingModel } from '~/models/bookingModel'
import { userModel } from '~/models/userModel'
import { voucherService } from '~/services/voucherService'
import { voucherModel } from '~/models/voucherModel'
import { notificationService } from '~/services/notificationService'
import { movieModel } from '~/models/movieModel'
import { env } from '~/config/environment'
import { showtimeModel } from '~/models/showtimeModel'
import { comboModel } from '~/models/comboModel'

export const paymentController = {
  initializePayment: async (req, res) => {
    console.log('🔥 BODY NHẬN ĐƯỢC TỪ FE:', req.body)

    try {
      const {
        showtimeId,
        movieId,
        seats,             // FE: ['B1', 'B2', ...]
        combos = {},       // FE: { comboId: quantity, ... }
        amount,
        pointsToSpend = 0,
        voucherCode = null,
        // orderInfo từ FE KHÔNG dùng cho MoMo để giữ format callback
      } = req.body

      // 1. Validate input cơ bản
      if (!showtimeId || !movieId || !Array.isArray(seats) || !amount) {
        return res.status(400).json({
          success: false,
          message:
            'Missing required fields: showtimeId, movieId, seats (array), amount'
        })
      }

      const userId = req.user._id
      const userIdString = userId.toString()

      // 2. Check ghế còn trống (dùng seatNumber string như FE gửi)
      const seatAvailability = await bookingModel.checkSeatAvailability(
        showtimeId,
        seats
      )

      if (!seatAvailability.available) {
        return res.status(400).json({
          success: false,
          message: 'Some seats are already booked',
          conflictingSeats: seatAvailability.conflictingSeats
        })
      }

      // 3. Lấy showtime để map ghế từ string -> object đúng schema
      const showtime = await showtimeModel.findOneById(showtimeId)
      if (!showtime) {
        return res.status(404).json({
          success: false,
          message: 'Showtime not found'
        })
      }

      // ==== CHUẨN HÓA SEATS ====
      // showtime.seats: [{ seatNumber, row, number, price, type, status, ... }]
      const selectedSeatNumbers = seats
      const seatsForBooking = selectedSeatNumbers
        .map(seatNum => {
          const s = showtime.seats.find(seat => seat.seatNumber === seatNum)
          if (!s) return null

          // 👇 CHỈ GIỮ row, number, price cho đúng Joi
          return {
            row: s.row ?? String(s.seatNumber)[0],
            number:
              s.number ??
              parseInt(String(s.seatNumber).slice(1), 10),
            price: s.price
          }
        })
        .filter(Boolean)

      if (seatsForBooking.length !== selectedSeatNumbers.length) {
        return res.status(400).json({
          success: false,
          message: 'Some seats not found in showtime'
        })
      }

      // ==== CHUẨN HÓA COMBOS ====
      let combosForBooking = []

      if (Array.isArray(combos)) {
        // Nếu FE sau này gửi đúng dạng array thì giữ nguyên, nhưng
        // vẫn đảm bảo có price
        combosForBooking = combos
      } else if (combos && typeof combos === 'object') {
        const entries = Object.entries(combos).filter(
          ([, qty]) => Number(qty) > 0
        )

        for (const [comboId, qty] of entries) {
          const comboDoc = await comboModel.findOneById(comboId)
          if (!comboDoc) continue

          combosForBooking.push({
            comboId,
            quantity: Number(qty),
            price: comboDoc.price // 👈 BỔ SUNG PRICE ĐỂ PASS VALIDATION
          })
        }
      }

      // 4. Logic giảm giá (voucher + điểm) – giữ nguyên như cũ
      let originalAmount = amount
      let finalAmount = originalAmount
      let discountAmount = 0
      let pointsDiscount = 0
      let appliedVoucher = null

      if (voucherCode) {
        const vResult = await voucherService.applyVoucher(
          voucherCode,
          finalAmount
        )
        if (vResult.error) {
          return res
            .status(400)
            .json({ success: false, message: vResult.error })
        }
        finalAmount = vResult.finalAmount
        discountAmount = vResult.discount
        appliedVoucher = vResult.voucher
      }

      if (pointsToSpend > 0) {
        const user = await userModel.findOneById(userId)
        if (pointsToSpend > user.loyaltyPoints) {
          return res.status(400).json({
            success: false,
            message: 'Not enough loyalty points.'
          })
        }
        pointsDiscount = Math.min(finalAmount, pointsToSpend)
        finalAmount = Math.max(0, finalAmount - pointsDiscount)
      }

      // 5. Tạo booking PENDING với data đã chuẩn hóa
      const bookingData = {
        userId: userIdString,
        showtimeId,
        movieId,
        seats: seatsForBooking,     // ✅ đúng schema
        combos: combosForBooking,   // ✅ có price
        originalAmount,
        totalAmount: finalAmount,
        discountAmount,
        pointsSpent: pointsDiscount,
        voucherCode,
        paymentMethod: 'momo',
        paymentStatus: 'pending',
        bookingStatus: 'active'
      }

      const newBooking = await bookingModel.createNew(bookingData)
      const bookingId = newBooking.insertedId.toString()

      // 6. Luôn dùng orderInfo có mã booking để callback đọc được
      const momoOrderInfo = `Booking_${bookingId}_MovieTickets`

      const momoRes = await MomoService.createPayment(
        finalAmount,
        momoOrderInfo
      )

      if (momoRes.resultCode !== 0) {
        console.error('❌ MoMo init failed:', momoRes)
        await bookingModel.cancelBooking(bookingId)

        return res.status(400).json({
          success: false,
          message: 'Failed to initialize MoMo payment',
          error: momoRes.message,
          momo: momoRes
        })
      }

      // 7. Trừ điểm + tăng usage voucher sau khi MoMo tạo đơn thành công
      if (pointsDiscount > 0) {
        await userModel.addLoyaltyPoints(userId, -pointsDiscount)
      }
      if (appliedVoucher) {
        await voucherModel.incrementUsage(appliedVoucher._id)
      }

      return res.status(200).json({
        success: true,
        data: {
          bookingId,
          paymentUrl: momoRes.payUrl,
          qrCodeUrl: momoRes.qrCodeUrl,
          amount: finalAmount,
          originalAmount,
          discount: discountAmount + pointsDiscount,
          orderInfo: momoOrderInfo,
          momoResult: momoRes
        }
      })
    } catch (error) {
      console.error(
        '❌ Error initializing MoMo payment:',
        error.response?.data || error.message || error
      )
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize payment',
        error: error.response?.data || error.message || error
      })
    }
  },

  // callback giữ nguyên như bạn đang có
  handlePaymentCallback: async (req, res) => {
    try {
      const paymentResult = await MomoService.handlePaymentCallback(req.body)

      let bookingId = null
      if (paymentResult && paymentResult.data?.orderInfo) {
        const parts = paymentResult.data.orderInfo.split('_')
        if (parts.length >= 2) bookingId = parts[1]
      }

      let invoice = null
      if (bookingId) {
        const paymentStatus = paymentResult.success ? 'completed' : 'failed'

        const updatedBooking = await bookingModel.updatePaymentStatus(
          bookingId,
          paymentStatus,
          paymentResult.transId
        )

        if (paymentStatus === 'completed' && updatedBooking) {
          const seatNumbers = updatedBooking.seats.map(
            seat => `${seat.row}${seat.number}`
          )

          await showtimeModel.updateSeatsStatus(
            updatedBooking.showtimeId,
            seatNumbers,
            'booked',
            null,
            null
          )

          const movie = await movieModel.findOneById(updatedBooking.movieId)
          const frontendBookingUrl = `${
            env.APP_URL_FRONTEND || 'http://localhost:5173'
          }/my-tickets/${bookingId}`

          await notificationService.createNotification(
            updatedBooking.userId.toString(),
            'ticket',
            'Mua vé thành công!',
            `Vé của bạn cho phim "${
              movie ? movie.title : 'Phim'
            }" đã được xác nhận.`,
            frontendBookingUrl,
            true
          )

          const pointsEarned = Math.floor(updatedBooking.totalAmount * 0.1)
          if (pointsEarned > 0) {
            await userModel.addLoyaltyPoints(
              updatedBooking.userId,
              pointsEarned
            )
          }

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
      console.error('❌ Error in MoMo callback:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to process payment callback',
        error: error.message
      })
    }
  }
}
