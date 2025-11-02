import express from 'express'
import { userRoute } from '~/routes/v1/userRoute'
import { movieRoute } from '~/routes/v1/movieRoute'
import { showtimeRoute } from '~/routes/v1/showtimeRoute'
import { comboRoute } from '~/routes/v1/comboRoute'
import { paymentRoute } from './paymentRoute'
import { qrRoute } from './qrRoute'
import { bookingRoute } from './bookingRoute'
import { voucherRoute } from './voucherRoute'

const Router = express.Router()

// User APIs
Router.use('/users', userRoute)
Router.use('/movies', movieRoute) // Thêm route cho movies
Router.use('/showtimes', showtimeRoute)
Router.use('/combos', comboRoute)
Router.use('/payments', paymentRoute)
Router.use('/qr', qrRoute)
Router.use('/bookings', bookingRoute)
Router.use('/vouchers', voucherRoute)

export const APIs_V1 = Router
