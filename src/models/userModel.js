/* eslint-disable no-unused-vars */
import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import crypto from 'crypto'

// Define Collection (name & schema)
const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
  username: Joi.string().required().min(3).max(50).trim().strict(),
  email: Joi.string().required().email().trim().strict(),
  googleId: Joi.string().default(null),
  password: Joi.string().allow(null).default(null).min(6).trim().strict(),
  role: Joi.string().valid('user', 'admin', 'staff').default('user'), //

  phone: Joi.string().pattern(/^[0-9]{10,11}$/).default(null).trim().strict(),
  dob: Joi.date().iso().default(null),

  // Thêm các trường cho xác thực email
  isVerified: Joi.boolean().default(false),
  emailVerificationToken: Joi.string().default(null),
  emailVerificationExpire: Joi.date().default(null),

  // Thêm các trường cho đặt lại mật khẩu
  resetPasswordToken: Joi.string().default(null),
  resetPasswordExpire: Joi.date().default(null),

  loyaltyPoints: Joi.number().integer().min(0).default(0),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định những trường không được cập nhật
const INVALID_UPDATE_FIELDS = ['_id', 'email', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
    return createdUser
  } catch (error) { throw new Error(error) }
}

const findOneById = async (id) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      _id: new ObjectId(id)
    })
    return result
  } catch (error) { throw new Error(error) }
}

const findOneByEmail = async (email) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: email })
    return result
  } catch (error) { throw new Error(error) }
}

// Thêm hàm update
const update = async (userId, updateData) => {
  try {
    // Lọc những field không cho phép cập nhật
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' } // Trả về document sau khi update
    )
    return result
  } catch (error) { throw new Error(error) }
}

// Thêm hàm để tạo reset token ngay trong model
const getResetPasswordToken = (user) => {
  // Tạo token ngẫu nhiên
  const resetToken = crypto.randomBytes(20).toString('hex')

  // Băm token và lưu vào CSDL
  const hashedToken = crypto.createHash('sha512').update(resetToken).digest('hex')
  // SỬA LẠI DÒNG NÀY
  const expireDate = new Date(Date.now() + 15 * 60 * 1000)

  return { resetToken, hashedToken, expireDate }
}

// HÀM MỚI: TÌM USER BẰNG TOKEN ĐÃ BĂM
const findOneByValidResetToken = async (hashedToken) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      resetPasswordToken: hashedToken,
      // Đảm bảo token chưa hết hạn
      resetPasswordExpire: { $gt: new Date() }
    })
    return result
  } catch (error) { throw new Error(error) }
}

// HÀM MỚI: TẠO TOKEN XÁC THỰC EMAIL (tương tự reset password)
const getEmailVerificationToken = () => {
  const verificationToken = crypto.randomBytes(20).toString('hex')
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')
  // Token có hiệu lực trong 24 giờ
  const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return { verificationToken, hashedToken, expireDate }
}

// HÀM MỚI: TÌM USER BẰNG TOKEN XÁC THỰC
const findOneByValidVerificationToken = async (hashedToken) => {
  return await GET_DB().collection(USER_COLLECTION_NAME).findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: new Date() }
  })
}

// HÀM MỚI
const deleteOneById = async (id) => {
  return await GET_DB().collection(USER_COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { _destroy: true, updatedAt: new Date() } }
  )
}

// HÀM MỚI: Lấy danh sách người dùng cho Admin
const getAllUsers = async ({ q, role, page = 1, limit = 10 } = {}) => {
  try {
    let query = { _destroy: false } // Luôn lọc các user đã bị "xóa mềm"

    // 1. Lọc theo vai trò (role)
    if (role) {
      query.role = role
    }

    // 2. Tìm kiếm (theo username hoặc email)
    if (q) {
      query.$or = [
        { username: { $regex: new RegExp(q, 'i') } }, // 'i' = không phân biệt hoa thường
        { email: { $regex: new RegExp(q, 'i') } }
      ]
    }

    // 3. Phân trang
    const pageNumber = Math.max(1, parseInt(page) || 1)
    const limitNumber = Math.max(1, parseInt(limit) || 10)
    const skip = (pageNumber - 1) * limitNumber

    // 4. Lấy tổng số lượng (để tính totalPages)
    const total = await GET_DB().collection(USER_COLLECTION_NAME).countDocuments(query)

    // 5. Định nghĩa các trường cần loại bỏ
    const projection = {
      password: 0,
      resetPasswordToken: 0,
      resetPasswordExpire: 0,
      emailVerificationToken: 0,
      emailVerificationExpire: 0
    }

    // 6. Thực thi truy vấn
    const users = await GET_DB().collection(USER_COLLECTION_NAME)
      .find(query)
      .project(projection) // Áp dụng projection để che thông tin nhạy cảm
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất lên đầu
      .skip(skip)
      .limit(limitNumber)
      .toArray()

    // 7. Trả về kết quả
    return {
      users,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber)
      }
    }

  } catch (error) { throw new Error(error) }
}

// HÀM MỚI: Dùng để cộng hoặc trừ điểm (atomic)
const addLoyaltyPoints = async (userId, points) => {
  try {
    return await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $inc: { loyaltyPoints: points } }, // $inc dùng để cộng/trừ
      { returnDocument: 'after' }
    )
  } catch (error) { throw new Error(error) }
}

export const userModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByEmail,
  update,
  getResetPasswordToken,
  findOneByValidResetToken,
  getEmailVerificationToken,
  findOneByValidVerificationToken,
  deleteOneById,
  getAllUsers,
  addLoyaltyPoints
}
