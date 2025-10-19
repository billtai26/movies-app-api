import { userService } from '~/services/userService'

const register = async (req, res) => {
  try {
    // Dữ liệu đã được validate ở tầng validation
    const createdUser = await userService.register(req.body)
    res.status(201).json(createdUser)
  } catch (error) {
    // Dùng res.status(...).json(...) để trả về lỗi một cách tường minh
    res.status(409).json({ errors: error.message }) // 409 Conflict khi user đã tồn tại
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

export const userController = {
  register,
  login,
  getUserProfile
}