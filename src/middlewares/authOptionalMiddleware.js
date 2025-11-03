import jwt from 'jsonwebtoken'
import asyncHandler from 'express-async-handler'
import { userModel } from '~/models/userModel'
import { env } from '~/config/environment'

/**
 * Middleware xác thực TÙY CHỌN (Optional).
 * - Nếu có token, xác thực và gán req.user.
 * - Nếu không có token, bỏ qua và next().
 */
const authOptional = asyncHandler(async (req, res, next) => {
  let token

  // Kiểm tra xem header Authorization có tồn tại và bắt đầu bằng 'Bearer' không
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header (loại bỏ 'Bearer ')
      token = req.headers.authorization.split(' ')[1]

      // Xác thực token
      const decoded = jwt.verify(token, env.JWT_SECRET)

      // Tìm user trong DB bằng ID từ token, gán vào req.user (trừ password)
      const user = await userModel.findOneById(decoded.userId)
      if (user && !user._destroy) {
        delete user.password
        req.user = user // Gán user vào request
      }

      next() // Token hợp lệ (hoặc user không còn tồn tại), cho đi tiếp
    } catch (error) {
      // Nếu token có nhưng KHÔNG HỢP LỆ (bị giả mạo, hết hạn)
      res.status(401)
      throw new Error('Not authorized, token failed')
    }
  } else {
    // Nếu không có header Authorization, CỨ CHO ĐI TIẾP
    next()
  }
})

export { authOptional }
