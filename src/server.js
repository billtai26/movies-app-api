/* eslint-disable no-console */
import express from 'express'
import cors from 'cors' // Thêm cors
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1' // Import router V1
import { startReleaseSeatsJob } from '~/jobs/releaseExpiredSeats'
import passport from 'passport'
import { configurePassport } from '~/config/passport'
import { createServer } from 'http'
import { Server } from 'socket.io'

let io = null // Khai báo biến io

const START_SERVER = () => {
  const app = express()

  // --- TẠO HTTP SERVER VÀ GẮN SOCKET.IO ---
  const httpServer = createServer(app)
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Cho phép tất cả các domain (thay đổi '*' thành domain frontend của bạn khi deploy)
      methods: ['GET', 'POST']
    }
  })

  // Lắng nghe sự kiện kết nối từ client
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`)

    // Lắng nghe sự kiện "join_movie_room" từ client
    // Khi client xem một phim, họ sẽ tham gia vào "phòng" của phim đó
    socket.on('join_movie_room', (movieId) => {
      socket.join(movieId) // Cho socket tham gia vào phòng có tên là movieId
      console.log(`Client ${socket.id} joined room ${movieId}`)
    })

    // Lắng nghe sự kiện "leave_movie_room"
    socket.on('leave_movie_room', (movieId) => {
      socket.leave(movieId)
      console.log(`Client ${socket.id} left room ${movieId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  // Kích hoạt CORS
  app.use(cors())

  // Kích hoạt express.json() middleware
  app.use(express.json())

  // Khởi tạo Passport
  app.use(passport.initialize())
  configurePassport() // Gọi hàm config

  // Sử dụng Routers
  app.use('/v1', APIs_V1)

  // Bắt đầu chạy job tự động hủy ghế
  startReleaseSeatsJob()

  app.use((err, req, res, next) => {

    // Lấy statusCode từ ApiError. Nếu không có (lỗi 500), mặc định là 500
    const statusCode = err.statusCode || 500

    // Trả về lỗi dạng JSON mà bạn mong muốn
    res.status(statusCode).json({
      errors: err.message
    })
  })

  httpServer.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
    console.log(`3. Hi ${env.AUTHOR}, Back-end Server is running successfully at Host: ${env.LOCAL_DEV_APP_HOST} and Port: ${env.LOCAL_DEV_APP_PORT}`)
  })

  exitHook(() => {
    console.log('4. Server is shutting down...')
    CLOSE_DB()
    console.log('5. Disconnected from MongoDB Cloud Atlas')
  })
}

(async () => {
  try {
    console.log('1. Connecting to MongoDB Cloud Atlas...')
    await CONNECT_DB()
    console.log('2. Connected to MongoDB Cloud Atlas!')

    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()

// --- EXPORT HÀM getIO ---
// Hàm này dùng để các service khác có thể lấy instance io và emit sự kiện
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!')
  }
  return io
}
