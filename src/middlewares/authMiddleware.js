import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import { userModel } from '~/models/userModel'
import { env } from '~/config/environment'


const protect = asyncHandler(async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header
      token = req.headers.authorization.split(' ')[1]

      // Xác thực token
      const decoded = jwt.verify(token, env.JWT_SECRET)

      // Lấy thông tin user từ token (trừ password) và gán vào req
      req.user = await userModel.findOneById(decoded.userId)
      delete req.user.password

      next()
    } catch (error) {
      res.status(401)
      throw new Error('Not authorized, token failed')
    }
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token')
  }
})

export { protect }