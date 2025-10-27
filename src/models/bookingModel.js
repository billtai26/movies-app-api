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
  paymentStatus: Joi.string().valid('pending', 'completed', 'failed').default('pending'),
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
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  cancelledAt: Joi.date().timestamp('javascript').default(null)
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
      _id: new ObjectId(id)
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

export const bookingModel = {
  BOOKING_COLLECTION_NAME,
  BOOKING_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  getBookingsByUserId,
  updatePaymentStatus,
  cancelBooking,
  checkSeatAvailability,
  getBookingStats
}