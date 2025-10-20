import express from 'express'
import { userRoute } from '~/routes/v1/userRoute'
import { movieRoute } from '~/routes/v1/movieRoute'
import { showtimeRoute } from '~/routes/v1/showtimeRoute'

const Router = express.Router()

// User APIs
Router.use('/users', userRoute)
Router.use('/movies', movieRoute) // Thêm route cho movies
Router.use('/showtimes', showtimeRoute)

export const APIs_V1 = Router
