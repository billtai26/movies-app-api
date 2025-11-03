import express from 'express'
import { userRoute } from '~/routes/v1/userRoute'
import { movieRoute } from '~/routes/v1/movieRoute'
import { showtimeRoute } from '~/routes/v1/showtimeRoute'
import { comboRoute } from '~/routes/v1/comboRoute'
import { paymentRoute } from './paymentRoute'
import { qrRoute } from './qrRoute'
import { bookingRoute } from './bookingRoute'
import { voucherRoute } from './voucherRoute'
import { newsRoute } from './newsRoute'
import { reviewRoute } from './reviewRoute'
import { commentRoute } from './commentRoute'
import { notificationRoute } from './notificationRoute'
import { submissionRoute } from './submissionRoute'

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
Router.use('/news', newsRoute)
Router.use('/reviews', reviewRoute)
Router.use('/comments', commentRoute)
Router.use('/notifications', notificationRoute)
Router.use('/submissions', submissionRoute)

export const APIs_V1 = Router
