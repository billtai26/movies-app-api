import { bookingModel } from '~/models/bookingModel'

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
  }
}