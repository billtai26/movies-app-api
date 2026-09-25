/* eslint-disable no-unused-vars */
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
import aiRoutes from './routes/v1/ai.Route.js'
import { initSocket } from '~/utils/socket'

let io = null // Khai báo biến io

const START_SERVER = () => {
  const app = express()

  // --- TẠO HTTP SERVER VÀ GẮN SOCKET.IO ---
  const httpServer = createServer(app)
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  // --- QUAN TRỌNG: Gán instance io vào utils để các controller khác sử dụng ---
  initSocket(io)

  // Lắng nghe sự kiện kết nối từ client
  io.on('connection', (socket) => {
    // console.log(`New client connected: ${socket.id}`)

    // 1. SỬA LẠI TÊN SỰ KIỆN CHO KHỚP VỚI FRONTEND (Seats.tsx)
    // Frontend: newSocket.emit('join_room', showtimeId);
    socket.on('join_room', (showtimeId) => {
      socket.join(showtimeId) // Tham gia vào phòng theo ID suất chiếu
      // console.log(`Client ${socket.id} joined room ${showtimeId}`)
    })

    socket.on('leave_room', (showtimeId) => {
      socket.leave(showtimeId)
      // console.log(`Client ${socket.id} left room ${showtimeId}`)
    })

    // 2. THÊM LOGIC LẮNG NGHE CHỌN GHẾ (HOLD)
    socket.on('seat:hold', ({ showtimeId, seatId, userId }) => {
      // console.log(`Client ${socket.id} held seat ${seatId} in showtime ${showtimeId}`)

      // Gửi sự kiện 'seat:updated' cho TẤT CẢ mọi người trong phòng TRỪ người gửi
      // Để người khác thấy ghế chuyển sang màu xám ngay lập tức
      socket.to(showtimeId).emit('seat:updated', {
        id: seatId,
        state: 'held', // Frontend sẽ hiển thị màu xám/đen dựa trên state này
        userId: userId
      })
    })

    // 3. THÊM LOGIC LẮNG NGHE BỎ CHỌN GHẾ (RELEASE)
    socket.on('seat:release', ({ showtimeId, seatId, userId }) => {
      // console.log(`Client ${socket.id} released seat ${seatId}`)

      // Báo cho mọi người khác là ghế này đã trống
      socket.to(showtimeId).emit('seat:updated', {
        id: seatId,
        state: 'empty', // Frontend sẽ hiển thị màu trắng
        userId: null
      })
    })

    // 4. THÊM LOGIC LẮNG NGHE BỎ CHỌN NHIỀU GHẾ (Khi hết giờ hoặc thoát trang)
    socket.on('seat:release_many', ({ showtimeId, seatIds, userId }) => {
      if (seatIds && seatIds.length > 0) {
        seatIds.forEach(seatId => {
          socket.to(showtimeId).emit('seat:updated', {
            id: seatId,
            state: 'empty',
            userId: null
          })
        })
      }
    })

    socket.on('disconnect', () => {
      // console.log(`Client disconnected: ${socket.id}`)
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

  // AI Chat routes
  app.use('/v1/ai', aiRoutes)


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

  // Kiểm tra xem có phải môi trường Production không (Dựa vào biến môi trường bạn đặt trên Render)
  if (env.BUILD_MODE === 'production') {
  // Lắng nghe Port từ Render cung cấp và bind vào 0.0.0.0
    httpServer.listen(process.env.PORT, () => {
      console.log(`3. Production: Hi ${env.AUTHOR}, Back-end Server is running successfully at Port: ${process.env.PORT}`)
    })
  } else {
  // Môi trường Local Dev
    httpServer.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
      console.log(`3. Local DEV: Hi ${env.AUTHOR}, Back-end Server is running successfully at Host: ${env.LOCAL_DEV_APP_HOST} and Port: ${env.LOCAL_DEV_APP_PORT}`)
    })
  }

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
