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

// --- CÁC ROUTE CỤ THỂ (ĐẶT LÊN TRÊN CÙNG) ---

Router.route('/register')
  .post(userValidation.register, userController.register)

Router.route('/login')
  .post(userValidation.login, userController.login)

Router.route('/verify-email/:token')
  .get(userController.verifyEmail)

Router.route('/forgot-password')
  .post(userValidation.forgotPassword, userController.forgotPassword)

Router.route('/reset-password/:resetToken')
  .put(userValidation.resetPassword, userController.resetPassword)

// Backwards-compatible route: accept token in body (frontend may send { token, password })
Router.route('/reset-password')
  .put(userValidation.resetPassword, userController.resetPassword)

Router.route('/profile/avatar')
  .patch(
    protect,
    upload.single('avatar'),
    userController.updateAvatar
  )

Router.route('/profile') // Route này phải nằm trên /:id
  .get(protect, userController.getUserProfile)
  .put(protect, userValidation.updateProfile, userController.updateProfile)
  .delete(protect, userController.deleteProfile)

// --- ROUTE GOOGLE AUTH ---
Router.route('/auth/google')
  .get(passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  }))

Router.route('/auth/google/callback')
  .get(
    passport.authenticate('google', { session: false, failureRedirect: '/login-failed' }),
    (req, res) => {
      const token = jwt.sign(
        { userId: req.user._id },
        env.JWT_SECRET,
        { expiresIn: '1d' }
      )
      res.status(200).json({
        message: 'Google login successful',
        token: token,
        user: req.user
      })
    }
  )

// --- CÁC ROUTE QUẢN TRỊ/ĐỘNG (ĐẶT XUỐNG DƯỚI CÙNG) ---

// Lấy danh sách user (Admin)
Router.route('/')
  .get(protect, admin, userController.getAllUsers)
  .post(
    protect,
    admin,
    userValidation.adminCreateUser,
    userController.adminCreateUser
  )

// Route /:id LÀ NGUYÊN NHÂN GÂY LỖI NẾU ĐẶT Ở TRÊN
// Nó sẽ bắt tất cả request có dạng /something nếu 'something' chưa được định nghĩa bên trên
Router.route('/:id')
  .get(protect, admin, userController.adminGetUserById)
  .patch(
    protect,
    admin,
    userValidation.adminUpdateUser,
    userController.adminUpdateUser
  )
  .delete(protect, admin, userController.adminDeleteUser)

export const userRoute = Router
