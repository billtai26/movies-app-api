import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'
import { upload } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

// HÀM MỚI CHO ADMIN: LẤY DANH SÁCH USER (có lọc, tìm kiếm, phân trang)
Router.route('/')
  .get(protect, admin, userController.getAllUsers)
  // POST /v1/users (Mới - Admin tạo user)
  .post(
    protect,
    admin,
    userValidation.adminCreateUser,
    userController.adminCreateUser
  )

// GET /v1/users/:id (Mới - Admin xem chi tiết)
// PATCH /v1/users/:id (Mới - Admin sửa)
// DELETE /v1/users/:id (Mới - Admin xoá)
Router.route('/:id')
  .get(protect, admin, userController.adminGetUserById)
  .patch(
    protect,
    admin,
    userValidation.adminUpdateUser,
    userController.adminUpdateUser
  )
  .delete(protect, admin, userController.adminDeleteUser)

Router.route('/register')
  .post(userValidation.register, userController.register)

Router.route('/login')
  .post(userValidation.login, userController.login)

Router.route('/profile/avatar')
  .patch(
    protect,
    upload.single('avatar'), // <-- SỬ DỤNG MULTER
    userController.updateAvatar // <-- Hàm controller mới
  )

// ROUTE MỚI ĐỂ XÁC THỰC EMAIL
Router.route('/verify-email/:token')
  .get(userController.verifyEmail) // Dùng GET vì người dùng chỉ cần nhấp vào link

Router.route('/profile')
  .get(protect, userController.getUserProfile)
  .put(protect, userValidation.updateProfile, userController.updateProfile)
  .delete(protect, userController.deleteProfile)

// ROUTE MỚI
Router.route('/forgot-password')
  .post(userValidation.forgotPassword, userController.forgotPassword)

// ROUTE MỚI
Router.route('/reset-password/:resetToken')
  .put(userValidation.resetPassword, userController.resetPassword) // Dùng PUT vì ta đang cập nhật resource


// ROUTE BẮT ĐẦU QUÁ TRÌNH OAUTH
Router.route('/auth/google')
  .get(passport.authenticate('google', {
    scope: ['profile', 'email'], // Yêu cầu lấy thông tin profile và email
    session: false
  }))

// ROUTE CALLBACK KHI GOOGLE TRẢ VỀ
Router.route('/auth/google/callback')
  .get(
    passport.authenticate('google', { session: false, failureRedirect: '/login-failed' }),
    (req, res) => {
      // Hàm này chỉ chạy khi passport xác thực thành công
      // req.user đã được gán bởi passport

      // 1. Tạo JWT token giống như khi login
      const token = jwt.sign(
        { userId: req.user._id },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      )

      // 2. Trả về token cho client
      // (Trong thực tế, bạn sẽ redirect về frontend với token)
      res.status(200).json({
        message: 'Google login successful',
        token: token,
        user: req.user
      })
    }
  )

export const userRoute = Router
