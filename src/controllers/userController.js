import { userService } from '~/services/userService'

// Sửa lại hàm register để nhận thông báo mới
const register = async (req, res, next) => {
  try {
    const result = await userService.register(req.body)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

const login = async (req, res) => {
  try {
    const result = await userService.login(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(401).json({ errors: error.message }) // 401 Unauthorized
  }
}

const getUserProfile = async (req, res) => {
  try {
    // req.user được gán từ middleware protect
    const user = await userService.getUserProfile(req.user._id)
    res.status(200).json(user)
  } catch (error) {
    res.status(404).json({ errors: error.message })
  }
}

// HÀM MỚI
const forgotPassword = async (req, res, next) => {
  try {
    const result = await userService.forgotPassword(req.body.email)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// HÀM MỚI
// eslint-disable-next-line no-unused-vars
const resetPassword = async (req, res, next) => {
  try {
    const resetToken = req.params.resetToken
    const newPassword = req.body.password
    const result = await userService.resetPassword(resetToken, newPassword)
    res.status(200).json(result)
  } catch (error) {
    // Nếu service ném lỗi (token sai/hết hạn), trả về 400
    // Bạn nên có một middleware xử lý lỗi tập trung để làm việc này gọn hơn
    res.status(400).json({ errors: error.message })
  }
}

// HÀM MỚI
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params
    const result = await userService.verifyEmail(token)
    res.status(200).json(result)
  } catch (error) {
    // Nếu token sai, trả về lỗi 400
    res.status(400).json({ errors: error.message })
  }
}

export const userController = {
  register,
  login,
  verifyEmail,
  getUserProfile,
  forgotPassword,
  resetPassword
}