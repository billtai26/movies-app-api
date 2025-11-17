/* eslint-disable no-console */
import { userModel } from '~/models/userModel'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'
import { mailService } from '~/utils/mailService'
import crypto from 'crypto'
import { ApiError } from '~/utils/ApiError'

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

  // Tạo đường link xác thực
  const verificationUrl = `http://localhost:8017/v1/users/verify-email/${verificationToken}`

  // Tạo nội dung email HTML
  const emailHtml = `
    <div>
      <h1>Chào mừng bạn đến với Movies Website!</h1>
      <p>Vui lòng nhấp vào liên kết bên dưới để kích hoạt tài khoản của bạn:</p>
      <a href="${verificationUrl}" target="_blank">Xác thực tài khoản</a>
      <p>Lưu ý: Liên kết này sẽ hết hạn sau 24 giờ.</p>
    </div>
  `

  // Gọi service để gửi email
  await mailService.sendEmail(createdUser.email, 'Xác thực tài khoản Movies App', emailHtml)

  // Trả về thông báo, không trả về thông tin user nữa
  return { message: 'Registration successful. Please check your email to verify your account.' }
}

// SỬA LẠI HÀM LOGIN
const login = async (reqBody) => {
  const { email, password } = reqBody
  const user = await userModel.findOneByEmail(email)

  // Nếu user không tồn tại, HOẶC user đã bị xóa mềm
  if (!user || user._destroy === true) {
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
  // const resetUrl = `http://your-frontend-domain.com/reset-password/${resetToken}`
  // console.log('!!! SIMULATING EMAIL SENDING !!!')
  // console.log(`Reset Password URL: ${resetUrl}`)
  // console.log('!!! END SIMULATION !!!')

  // Code mới (Sử dụng mailService):
  const resetUrl = `http://localhost:5173/reset-password/${resetToken}` // (Thay bằng link frontend của bạn)

  const emailHtml = `
    <div>
      <h1>Yêu cầu đặt lại mật khẩu</h1>
      <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Vui lòng nhấp vào liên kết bên dưới để đặt lại mật khẩu:</p>
      <a href="${resetUrl}" target="_blank">Đặt lại mật khẩu</a>
      <p>Lưu ý: Liên kết này sẽ hết hạn sau 15 phút.</p>
      <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
    </div>
  `

  // Gọi service để gửi email
  await mailService.sendEmail(
    user.email,
    'Yêu cầu đặt lại mật khẩu Movies App',
    emailHtml
  )

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

// HÀM MỚI
const updateProfile = async (userId, updateData) => {
  // Hàm update trong model đã xử lý việc lọc các trường không hợp lệ
  // nên chúng ta có thể truyền thẳng updateData
  const updatedUser = await userModel.update(userId, updateData)
  delete updatedUser.password // Xóa password trước khi trả về
  return updatedUser
}

const deleteProfile = async (userId) => {
  await userModel.deleteOneById(userId)
  return { message: 'Account deleted successfully' }
}

// HÀM MỚI
const getAllUsers = async (queryParams) => {
  // queryParams sẽ là req.query từ controller (chứa q, role, page, limit)
  const allUsersData = await userModel.getAllUsers(queryParams)
  return allUsersData
}

/**
 * HÀM MỚI: (Admin) Tạo user
 * (Admin không cần verify email, mật khẩu có thể tự gán)
 */
const adminCreateUser = async (reqBody) => {
  const { username, email, password, role } = reqBody
  const userExists = await userModel.findOneByEmail(email)
  if (userExists) {
    throw new ApiError(400, 'E-mail already exists')
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)
  const newUser = {
    username,
    email,
    password: hashedPassword,
    role: role || 'user', // Nếu admin không gán role, mặc định là user
    isVerified: true // Admin tạo thì coi như đã xác thực
  }
  const createdUserResult = await userModel.createNew(newUser)
  const createdUser = await userModel.findOneById(createdUserResult.insertedId)
  delete createdUser.password // Xoá pass trước khi trả về
  return createdUser
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết 1 user
 */
const adminGetUserById = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user || user._destroy) {
    throw new ApiError(404, 'User not found')
  }
  delete user.password
  return user
}

/**
 * HÀM MỚI: (Admin) Cập nhật 1 user
 */
const adminUpdateUser = async (userId, updateData) => {
  // Hàm update của model đã tự lọc các trường không hợp lệ
  // updateData có thể chứa: username, role, loyaltyPoints, isVerified
  const updatedUser = await userModel.update(userId, updateData)
  if (!updatedUser) {
    throw new ApiError(404, 'User not found')
  }
  delete updatedUser.password
  return updatedUser
}

/**
 * HÀM MỚI: (Admin) Xoá mềm 1 user
 */
const adminDeleteUser = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }
  await userModel.deleteOneById(userId)
  return { message: 'User soft deleted successfully' }
}

export const userService = {
  register,
  login,
  verifyEmail, // Thêm vào
  getUserProfile,
  forgotPassword,
  resetPassword,
  updateProfile,
  deleteProfile,
  getAllUsers,
  // Thêm 4 hàm mới
  adminCreateUser,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser
}