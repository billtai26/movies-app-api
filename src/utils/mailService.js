import nodemailer from 'nodemailer'
import { env } from '~/config/environment'

/**
 * Khởi tạo một đối tượng "transporter" của nodemailer
 * Đối tượng này sẽ chịu trách nhiệm kết nối và gửi email
 */
const transporter = nodemailer.createTransport({
  service: 'gmail', // Sử dụng dịch vụ Gmail
  auth: {
    user: env.MAIL_USER, // Email của bạn
    pass: env.MAIL_PASSWORD // Mật khẩu ứng dụng 16 ký tự
  }
})

/**
 * Hàm gửi email chung
 * @param {string} to - Email của người nhận
 * @param {string} subject - Chủ đề email
 * @param {string} htmlContent - Nội dung email (dạng HTML)
 */
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"Movies App" <${env.MAIL_USER}>`, // Tên người gửi và email
      to: to,
      subject: subject,
      html: htmlContent
    }

    // Gửi email
    await transporter.sendMail(mailOptions)
    // console.log(`Email sent successfully to ${to}`)
  } catch (error) {
    // console.error(`Error sending email to ${to}:`, error)
    // Ném lỗi để service gọi nó có thể xử lý
    throw new Error('Error sending verification email')
  }
}

// Export hàm để nơi khác có thể dùng
export const mailService = {
  sendEmail
}