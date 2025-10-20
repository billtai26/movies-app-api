/* eslint-disable no-console */
import { userModel } from '~/models/userModel'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'
import crypto from 'crypto'

// SỬA LẠI HÀM REGISTER
const register = async (reqBody) => {
  const { username, email, password } = reqBody
  const userExists = await userModel.findOneByEmail(email)
  if (userExists) {
    throw new Error('E-mail already exists')
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)
  const newUser = {
    username,
    email,
    password: hashedPassword
    // isVerified và các trường token sẽ có giá trị default
  }
  const createdUserResult = await userModel.createNew(newUser)
  const createdUser = await userModel.findOneById(createdUserResult.insertedId)

  // Tạo và lưu token xác thực email
  const { verificationToken, hashedToken, expireDate } = userModel.getEmailVerificationToken()
  await userModel.update(createdUser._id, {
    emailVerificationToken: hashedToken,
    emailVerificationExpire: expireDate
  })

  // Mô phỏng gửi email
  const verificationUrl = `http://localhost:8017/v1/users/verify-email/${verificationToken}`
  console.log('!!! SIMULATING EMAIL VERIFICATION !!!')
  console.log(`Verification URL: ${verificationUrl}`)
  console.log('!!! END SIMULATION !!!')

  // Trả về thông báo, không trả về thông tin user nữa
  return { message: 'Registration successful. Please check your email to verify your account.' }
}

// SỬA LẠI HÀM LOGIN
const login = async (reqBody) => {
  const { email, password } = reqBody
  const user = await userModel.findOneByEmail(email)
  if (!user) {
    throw new Error('Invalid email or password')
  }

  // THÊM BƯỚC KIỂM TRA XÁC THỰC
  if (!user.isVerified) {
    throw new Error('Account not verified. Please check your email.')
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw new Error('Invalid email or password')
  }

  const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, { expiresIn: '1d' })
  delete user.password
  return { user, token }
}

// HÀM MỚI: XỬ LÝ XÁC THỰC EMAIL
const verifyEmail = async (verificationToken) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')

  const user = await userModel.findOneByValidVerificationToken(hashedToken)
  if (!user) {
    throw new Error('Invalid or expired verification token')
  }

  // Cập nhật trạng thái và xóa token
  await userModel.update(user._id, {
    isVerified: true,
    emailVerificationToken: null,
    emailVerificationExpire: null
  })

  return { message: 'Email verified successfully. You can now log in.' }
}

const getUserProfile = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  delete user.password
  return user
}

const forgotPassword = async (email) => {
  const user = await userModel.findOneByEmail(email)

  // Vì lý do bảo mật, ta không báo lỗi "User not found".
  // Luôn trả về thông báo thành công để tránh kẻ xấu dò email.
  if (!user) {
    return { message: 'An e-mail has been sent to you with further instructions.' }
  }

  // Lấy token gốc, token đã băm và ngày hết hạn từ model
  const { resetToken, hashedToken, expireDate } = userModel.getResetPasswordToken()

  // Lưu token đã băm và ngày hết hạn vào document của user
  await userModel.update(user._id, {
    resetPasswordToken: hashedToken,
    resetPasswordExpire: expireDate
  })

  // TODO: TÍCH HỢP GỬI EMAIL THẬT Ở ĐÂY
  // Gửi email cho người dùng chứa `resetToken` (token GỐC).
  // Bạn có thể dùng các thư viện như Nodemailer để làm việc này.
  const resetUrl = `http://your-frontend-domain.com/reset-password/${resetToken}`
  console.log('!!! SIMULATING EMAIL SENDING !!!')
  console.log(`Reset Password URL: ${resetUrl}`)
  console.log('!!! END SIMULATION !!!')

  return { message: 'An e-mail has been sent to you with further instructions.' }
}

// HÀM MỚI: XỬ LÝ ĐẶT LẠI MẬT KHẨU
const resetPassword = async (resetToken, newPassword) => {
  // Băm token nhận được từ URL để so sánh với token trong CSDL
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')


  // Tìm user có token hợp lệ (đã băm và chưa hết hạn)
  const user = await userModel.findOneByValidResetToken(hashedToken)
  if (!user) {
    throw new Error('Invalid or expired token')
  }

  // Mã hóa mật khẩu mới
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  // Cập nhật mật khẩu mới và xóa token đi để không dùng lại được
  await userModel.update(user._id, {
    password: hashedPassword,
    resetPasswordToken: null,
    resetPasswordExpire: null
  })

  return { message: 'Password reset successful' }
}

export const userService = {
  register,
  login,
  verifyEmail, // Thêm vào
  getUserProfile,
  forgotPassword,
  resetPassword
}