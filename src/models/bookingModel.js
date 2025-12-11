import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants'

// Define Collection Name & Schema
const BOOKING_COLLECTION_NAME = 'bookings'
const BOOKING_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  showtimeId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  movieId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  seats: Joi.array().items(
    Joi.object({
      row: Joi.string().required(),
      number: Joi.number().required(),
      price: Joi.number().required()
    })
  ).required(),
  totalAmount: Joi.number().required(),

  // --- THÊM CÁC TRƯỜNG MỚI ---
  originalAmount: Joi.number().required(), // Tổng tiền GỐC (trước khi giảm)
  discountAmount: Joi.number().default(0), // Số tiền được giảm
  pointsSpent: Joi.number().integer().default(0), // Số điểm đã dùng
  voucherCode: Joi.string().allow(null, ''), // Mã voucher đã dùng
  // -------------------------

  paymentStatus: Joi.string().valid('pending', 'completed', 'failed', 'refunded').default('pending'),
  paymentMethod: Joi.string().valid('momo', 'cash').required(),
  transactionId: Joi.string().allow(null, ''),
  bookingStatus: Joi.string().valid('active', 'cancelled').default('active'),
  combos: Joi.array().items(
    Joi.object({
      comboId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().required()
    })
  ),
  isUsed: Joi.boolean().default(false),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  cancelledAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

const validateBeforeCreate = async (data) => {
  return await BOOKING_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const newBookingToAdd = {
      ...validData,
      userId: new ObjectId(validData.userId),
      showtimeId: new ObjectId(validData.showtimeId),
      movieId: new ObjectId(validData.movieId),
      combos: validData.combos ? validData.combos.map(combo => ({
        ...combo,
        comboId: new ObjectId(combo.comboId)
      })) : []
    }

    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).insertOne(newBookingToAdd)
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      _destroy: false
    })
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getBookingsByUserId = async (userId) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME)
      .find({
        userId: new ObjectId(userId)
      })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const updatePaymentStatus = async (bookingId, paymentStatus, transactionId = null) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          paymentStatus: paymentStatus,
          transactionId: transactionId,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const cancelBooking = async (bookingId) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          bookingStatus: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

const checkSeatAvailability = async (showtimeId, seats) => {
  try {
    const existingBookings = await GET_DB().collection(BOOKING_COLLECTION_NAME)
      .find({
        showtimeId: new ObjectId(showtimeId),
        bookingStatus: 'active',
        paymentStatus: { $in: ['pending', 'completed'] }
      })
      .toArray()

    const bookedSeats = existingBookings.flatMap(booking => booking.seats)
    const requestedSeats = seats.map(seat => `${seat.row}-${seat.number}`)

    const conflictingSeats = bookedSeats.filter(bookedSeat =>
      requestedSeats.includes(`${bookedSeat.row}-${bookedSeat.number}`)
    )

    return {
      available: conflictingSeats.length === 0,
      conflictingSeats
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getBookingStats = async (startDate, endDate) => {
  try {
    const stats = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 },
          averageAmount: { $avg: '$totalAmount' }
        }
      }
    ]).toArray()

    return stats[0] || {
      totalRevenue: 0,
      totalBookings: 0,
      averageAmount: 0
    }
  } catch (error) {
    throw new Error(error)
  }
}

const update = async (id, data) => {
  try {
    // Lọc các trường không được phép cập nhật
    delete data.createdAt
    delete data._id
    delete data.userId // Không nên cho đổi userId của booking

    const updateData = {
      ...data,
      updatedAt: new Date() // Cập nhật thời gian
    }

    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )
    return result
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * HÀM MỚI (ĐÃ SỬA): (Admin) Lấy danh sách dùng Aggregate để join bảng
 */
const getAll = async (filters = {}, pagination = {}) => {
  try {
    const { userId, movieId, paymentStatus, bookingStatus, createdAtDate } = filters
    const { page = 1, limit = 10, skip = 0 } = pagination

    let query = { _destroy: false }

    if (userId) query.userId = new ObjectId(userId)
    if (movieId) query.movieId = new ObjectId(movieId)
    if (paymentStatus) query.paymentStatus = paymentStatus
    if (bookingStatus) query.bookingStatus = bookingStatus

    if (createdAtDate) {
      const startDate = new Date(createdAtDate + 'T00:00:00+07:00')
      const endDate = new Date(createdAtDate + 'T23:59:59+07:00')
      query.createdAt = { $gte: startDate, $lte: endDate }
    }

    // 1. Lấy tổng số lượng
    const totalBookings = await GET_DB().collection(BOOKING_COLLECTION_NAME).countDocuments(query)

    // 2. Lấy dữ liệu chi tiết bằng Aggregate
    const bookings = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // Join Phim để lấy tên
      { $lookup: {
        from: 'movies',
        localField: 'movieId',
        foreignField: '_id',
        as: 'movieDetail'
      } },
      { $unwind: { path: '$movieDetail', preserveNullAndEmptyArrays: true } },

      // Join Suất chiếu để lấy giờ & rạp
      { $lookup: {
        from: 'showtimes',
        localField: 'showtimeId',
        foreignField: '_id',
        as: 'showtimeDetail'
      } },
      { $unwind: { path: '$showtimeDetail', preserveNullAndEmptyArrays: true } },

      // Join Rạp (Cinema) từ showtimeDetail
      { $lookup: {
        from: 'cinemas',
        localField: 'showtimeDetail.cinemaId',
        foreignField: '_id',
        as: 'cinemaDetail'
      } },
      { $unwind: { path: '$cinemaDetail', preserveNullAndEmptyArrays: true } },

      // Format dữ liệu trả về cho đẹp (Flatten)
      { $project: {
        _id: 1,
        userId: 1,
        bookingStatus: 1,
        paymentStatus: 1,
        totalAmount: 1,
        seats: 1,
        isUsed: 1,
        createdAt: 1,
        updatedAt: 1,
        transactionId: 1,
        // Mapping các trường Frontend cần
        code: '$transactionId', // Gán transactionId thành code
        movieTitle: '$movieDetail.title',
        theaterName: '$cinemaDetail.name',
        startTime: '$showtimeDetail.startTime',
        posterUrl: '$movieDetail.posterUrl'
      } }
    ]).toArray()

    return {
      bookings,
      pagination: {
        totalItems: totalBookings,
        totalPages: Math.ceil(totalBookings / limit),
        currentPage: page,
        limit
      }
    }
  } catch (error) { throw new Error(error) }
}

/**
 * HÀM MỚI: (Admin) Xoá mềm
 */
const softDelete = async (id) => {
  return await GET_DB().collection(BOOKING_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

/**
 * HÀM MỚI: (Admin) Thêm combo và cập nhật tổng tiền
 * (Sử dụng $push để thêm vào mảng và $inc để cộng dồn an toàn)
 */
const addCombosAndUpdateAmount = async (bookingId, newCombos, addedAmount) => {
  try {
    // Chuyển đổi comboId sang ObjectId trước khi push
    const combosToPush = newCombos.map(c => ({
      ...c,
      comboId: new ObjectId(c.comboId)
    }))

    return await GET_DB().collection(BOOKING_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      {
        $push: { combos: { $each: combosToPush } }, // Thêm các combo mới vào mảng
        $inc: {
          totalAmount: addedAmount, // Cộng dồn vào tổng tiền
          originalAmount: addedAmount // Cộng dồn vào tiền gốc
        },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' } // Trả về document sau khi update
    )
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * HÀM MỚI: (Admin/Staff) Tìm và đánh dấu vé đã sử dụng
 * (Chỉ update nếu vé đã thanh toán VÀ chưa được sử dụng)
 */
const markAsUsed = async (id) => {
  try {
    return await GET_DB().collection(BOOKING_COLLECTION_NAME).findOneAndUpdate(
      {
        _id: new ObjectId(id),
        paymentStatus: 'completed', // ĐIỀU KIỆN 1: Phải hoàn tất thanh toán
        isUsed: false, // ĐIỀU KIỆN 2: Phải chưa được dùng
        _destroy: false
      },
      {
        $set: {
          isUsed: true,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' } // Trả về document sau khi update
    )
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * HÀM MỚI: Lấy chi tiết vé kèm thông tin Phim, Rạp, Suất chiếu
 */
const findDetailById = async (id) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).aggregate([
      { $match: { _id: new ObjectId(id) } },

      // 1. Join lấy thông tin Phim (movie)
      { $lookup: {
        from: 'movies',
        localField: 'movieId',
        foreignField: '_id',
        as: 'movie'
      } },
      { $unwind: { path: '$movie', preserveNullAndEmptyArrays: true } },

      // 2. Join lấy thông tin Suất chiếu (showtime)
      { $lookup: {
        from: 'showtimes',
        localField: 'showtimeId',
        foreignField: '_id',
        as: 'showtime'
      } },
      { $unwind: { path: '$showtime', preserveNullAndEmptyArrays: true } },

      // 3. Join lấy thông tin Rạp (cinema) từ showtime.cinemaId
      { $lookup: {
        from: 'cinemas',
        localField: 'showtime.cinemaId',
        foreignField: '_id',
        as: 'cinema'
      } },
      { $unwind: { path: '$cinema', preserveNullAndEmptyArrays: true } },

      // 4. Join lấy thông tin Phòng chiếu (room/cinemaHall) từ showtime.theaterId
      { $lookup: {
        from: 'cinemahalls',
        localField: 'showtime.theaterId',
        foreignField: '_id',
        as: 'room'
      } },
      { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } }
    ]).toArray()

    return result[0] || null
  } catch (error) {
    throw new Error(error)
  }
}

export const bookingModel = {
  BOOKING_COLLECTION_NAME,
  BOOKING_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  getBookingsByUserId,
  updatePaymentStatus,
  cancelBooking,
  checkSeatAvailability,
  getBookingStats,
  update,
  getAll,
  softDelete,
  addCombosAndUpdateAmount,
  markAsUsed,
  findDetailById
}
