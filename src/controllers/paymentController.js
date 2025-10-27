import MomoService from '~/services/momoService'
import { bookingModel } from '~/models/bookingModel'

export const paymentController = {
  initializePayment: async (req, res) => {
    try {
      const {
        showtimeId,
        movieId,
        seats,
        combos = [],
        amount
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

      // Create new booking
      const bookingData = {
        userId: userIdString,
        showtimeId,
        movieId,
        seats,
        combos,
        totalAmount: amount,
        paymentMethod: 'momo',
        paymentStatus: 'pending',
        bookingStatus: 'active'
      }

      const newBooking = await bookingModel.createNew(bookingData)

      // Create payment with MoMo
      const orderInfo = `Booking_${newBooking.insertedId}_MovieTickets`
      const paymentResponse = await MomoService.createPayment(amount, orderInfo)

      if (paymentResponse.resultCode !== 0) {
        // If MoMo payment initialization fails, cancel the booking
        await bookingModel.cancelBooking(newBooking.insertedId)
        return res.status(400).json({
          success: false,
          message: 'Failed to initialize MoMo payment',
          error: paymentResponse.message
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          bookingId: newBooking.insertedId,
          paymentUrl: paymentResponse.payUrl,
          amount: amount,
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
      const paymentResult = await MomoService.handlePaymentCallback(req.body)

      // Assuming we can extract bookingId from orderInfo
      // You might want to store this mapping when creating the payment
      const bookingId = paymentResult.orderInfo.split('_')[1] // Example format: "Payment for booking_12345"

      if (bookingId) {
        const paymentStatus = paymentResult.success ? 'completed' : 'failed'
        await bookingModel.updatePaymentStatus(
          bookingId,
          paymentStatus,
          paymentResult.transactionId
        )
      }

      // Return MoMo's expected response format
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
        extraData: req.body.extraData || ''
      })
    } catch (error) {
      // console.error('Error handling MoMo payment callback:', error)
      return res.status(500).json({
        success: false,
        message: 'Failed to process payment callback',
        error: error.message
      })
    }
  }
}