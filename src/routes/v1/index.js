import express from 'express'
import { userRoute } from '~/routes/v1/userRoute'

const Router = express.Router()

// User APIs
Router.use('/users', userRoute)

export const APIs_V1 = Router
