import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { userModel } from '~/models/userModel'
import { env } from './environment'

export const configurePassport = () => {
  passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/v1/users/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    // Đây là logic cốt lõi: tìm hoặc tạo người dùng
    try {
      // profile chứa thông tin từ Google (email, tên, googleId)
      const email = profile.emails[0].value
      const googleId = profile.id
      const username = profile.displayName

      let user = await userModel.findOneByEmail(email)

      if (user) {
        // Nếu user đã tồn tại, cập nhật googleId
        if (!user.googleId) {
          user = await userModel.update(user._id, { googleId: googleId, isVerified: true })
        }
      } else {
        // Nếu user chưa tồn tại, tạo mới
        const newUser = {
          googleId: googleId,
          email: email,
          username: username,
          isVerified: true,
          password: null // Không cần mật khẩu khi đăng nhập bằng OAuth
        }
        const createdUserResult = await userModel.createNew(newUser)
        user = await userModel.findOneById(createdUserResult.insertedId)
      }

      // Gửi user cho passport
      return done(null, user)
    } catch (error) {
      return done(error, null)
    }
  }))
}