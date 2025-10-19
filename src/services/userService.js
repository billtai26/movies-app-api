import { userModel } from '~/models/userModel'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '~/config/environment'

const register = async (reqBody) => {
  const { username, email, password } = reqBody

  // 1. Kiểm tra xem email đã tồn tại chưa
  const userExists = await userModel.findOneByEmail(email)
  if (userExists) {
    throw new Error('E-mail already exists')
  }

  // 2. Mã hóa mật khẩu
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  // 3. Tạo user mới
  const newUser = {
    username,
    email,
    password: hashedPassword
  }
  const createdUser = await userModel.createNew(newUser)

  // 4. Lấy thông tin user vừa tạo (không bao gồm password)
  const getNewUser = await userModel.findOneById(createdUser.insertedId)
  // Xóa password khỏi đối tượng trả về
  delete getNewUser.password

  return getNewUser

}

const login = async (reqBody) => {
  const { email, password } = reqBody

  // 1. Tìm user bằng email
  const user = await userModel.findOneByEmail(email)
  if (!user) {
    throw new Error('Invalid email or password')
  }

  // 2. So sánh mật khẩu
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw new Error('Invalid email or password')
  }

  // 3. Tạo và trả về JWT
  const token = jwt.sign(
    { userId: user._id },
    env.JWT_SECRET,
    { expiresIn: '1d' } // Token hết hạn sau 1 ngày
  )

  // Xóa password khỏi đối tượng user trả về
  delete user.password

  return { user, token }
}

const getUserProfile = async (userId) => {
  const user = await userModel.findOneById(userId)
  if (!user) {
    throw new Error('User not found')
  }
  delete user.password
  return user
}

export const userService = {
  register,
  login,
  getUserProfile
}