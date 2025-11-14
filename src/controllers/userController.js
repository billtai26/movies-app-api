import { userService } from '~/services/userService'
import { uploadService } from '~/services/uploadService'
import { ApiError } from '~/utils/ApiError'

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
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params
    const result = await userService.verifyEmail(token)
    res.status(200).json(result)
  } catch (error) {
    // Nếu token sai, trả về lỗi 400
    res.status(400).json({ errors: error.message })
  }
}

// HÀM MỚI
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id // Lấy từ middleware 'protect'
    const updateData = req.body // Dữ liệu đã được lọc bởi validation

    const updatedUser = await userService.updateProfile(userId, updateData)
    res.status(200).json(updatedUser)
  } catch (error) {
    next(error)
  }
}

const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user._id
    const result = await userService.deleteProfile(userId)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

// HÀM MỚI
const getAllUsers = async (req, res, next) => {
  try {
    const allUsersData = await userService.getAllUsers(req.query)
    res.status(200).json(allUsersData)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) POST /
 */
const adminCreateUser = async (req, res, next) => {
  try {
    const createdUser = await userService.adminCreateUser(req.body)
    res.status(201).json(createdUser)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) GET /:id
 */
const adminGetUserById = async (req, res, next) => {
  try {
    const user = await userService.adminGetUserById(req.params.id)
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) PATCH /:id
 */
const adminUpdateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.adminUpdateUser(req.params.id, req.body)
    res.status(200).json(updatedUser)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) DELETE /:id
 */
const adminDeleteUser = async (req, res, next) => {
  try {
    const result = await userService.adminDeleteUser(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

const updateAvatar = async (req, res, next) => {
  try {
    // 1. Kiểm tra file (multer đã lưu file vào req.file)
    if (!req.file) {
      throw new ApiError(400, 'No avatar file provided')
    }

    // 2. Lấy user ID từ token
    const userId = req.user._id

    // 3. Upload file buffer lên Cloudinary
    // req.file.buffer là nơi multer lưu file khi dùng memoryStorage
    const { url } = await uploadService.uploadFileToCloudinary(
      req.file.buffer,
      'avatars' // <-- Tên thư mục trên Cloudinary
    )

    // 4. Lưu URL mới vào user
    // (Tái sử dụng hàm 'updateProfile' của bạn)
    const updatedUser = await userService.updateProfile(userId, { avatarUrl: url })

    res.status(200).json(updatedUser)
  } catch (error) {
    next(error)
  }
}

export const userController = {
  register,
  login,
  verifyEmail,
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
  adminDeleteUser,
  updateAvatar
}