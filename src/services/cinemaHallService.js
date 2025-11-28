import { cinemaHallModel } from '~/models/cinemaHallModel'
import { cinemaModel } from '~/models/cinemaModel'
import { ObjectId } from 'mongodb'
import { slugify } from '~/utils/formatters'
import { ApiError } from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/**
 * 1. Thêm phòng chiếu (và tự động tạo ghế)
 */
const createNew = async (reqBody) => {
  // 1. Kiểm tra Rạp tồn tại
  // 👉 THÊM DÒNG LOG NÀY
  // console.log('DEBUG - ID nhận được:', reqBody.cinemaId)
  // console.log('DEBUG - ID sau khi convert:', new ObjectId(reqBody.cinemaId))

  const foundCinema = await cinemaModel.findOneById(new ObjectId(reqBody.cinemaId))
  if (!foundCinema) {
    // 👉 THÊM DÒNG LOG NÀY
    // console.log('DEBUG - Lỗi: Tìm trong DB không thấy rạp nào khớp ID trên!')
    throw new ApiError(StatusCodes.NOT_FOUND, 'Cinema not found')
  }
  // 2. LOGIC SINH GHẾ TỪ CONFIG
  // LOGIC SINH GHẾ TỪ CONFIG
  const { rows, seatsPerRow, vipRows, coupleRows } = reqBody.seatLayout
  const seats = []

  rows.forEach(rowChar => {
    for (let i = 1; i <= seatsPerRow; i++) {
      let seatType = 'standard' // 👉 Đổi tên biến type -> seatType

      if (vipRows && vipRows.includes(rowChar)) {
        seatType = 'vip'
      }
      if (coupleRows && coupleRows.includes(rowChar)) {
        seatType = 'couple'
      }

      seats.push({
        row: rowChar, // VD: "A"
        number: i, // VD: 1
        seatType: seatType // VD: "VIP"
      })
    }
  })

  // 3. Chuẩn bị dữ liệu lưu DB
  const newHallData = {
    name: reqBody.name,
    slug: slugify(reqBody.name),
    cinemaId: reqBody.cinemaId,
    cinemaType: reqBody.cinemaType,
    totalSeats: seats.length, // Tự tính tổng ghế
    seats: seats, // 👉 Lưu mảng ghế đã sinh ra vào DB
    // Lưu lại config để sau này hiển thị lại form edit nếu cần
    seatConfig: reqBody.seatLayout,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  // 4. Lưu
  const createdHall = await cinemaHallModel.createNew(newHallData)
  return await cinemaHallModel.findOneById(createdHall.insertedId)
}

/**
 * 2. Sửa thông tin phòng (Tên, Loại)
 */
const updateHall = async (hallId, reqBody) => {
  let updateData = {
    ...reqBody,
    updatedAt: new Date()
  }

  // 👉 LOGIC QUAN TRỌNG: Nếu có sửa layout -> Tính toán lại ghế
  if (reqBody.seatLayout) {
    const { rows, seatsPerRow, vipRows, coupleRows } = reqBody.seatLayout
    const seats = []

    rows.forEach(rowChar => {
      for (let i = 1; i <= seatsPerRow; i++) {
        let seatType = 'standard' // Chữ thường
        if (vipRows && vipRows.includes(rowChar)) seatType = 'vip'
        if (coupleRows && coupleRows.includes(rowChar)) seatType = 'couple'

        seats.push({
          row: rowChar,
          number: i,
          seatType: seatType
        })
      }
    })

    // Gán dữ liệu ghế mới vào gói update
    updateData.seats = seats
    updateData.totalSeats = seats.length
    updateData.seatConfig = reqBody.seatLayout
  }

  // Loại bỏ cinemaId khỏi gói update (thường không cho phép chuyển phòng sang rạp khác)
  if (updateData.cinemaId) delete updateData.cinemaId

  const updatedHall = await cinemaHallModel.update(hallId, updateData)
  if (!updatedHall) {
    throw new Error('Hall not found or update failed')
  }
  return updatedHall
}

/**
 * 3. Sửa 1 Ghế cụ thể (Status, Type)
 */
const updateSeat = async (hallId, reqBody) => {
  const { row, number, status, seatType } = reqBody

  const updatedHall = await cinemaHallModel.updateSeatStatus(hallId, row, number, status, seatType)
  if (!updatedHall) {
    throw new Error('Hall or Seat not found, or update failed')
  }
  return updatedHall
}

/**
 * 4. Xoá mềm phòng chiếu
 */
const deleteHall = async (hallId) => {
  const hall = await cinemaHallModel.findOneById(hallId)
  if (!hall) throw new Error('Hall not found')
  // (Nâng cao: Kiểm tra xem phòng này có suất chiếu (showtime) nào không)
  await cinemaHallModel.softDelete(hallId)
  return { message: 'Hall soft deleted successfully' }
}

/**
 * 5. Lấy chi tiết phòng (bao gồm ghế)
 */
const getHallDetails = async (hallId) => {
  const hall = await cinemaHallModel.findOneById(hallId)
  if (!hall) throw new Error('Hall not found')
  return hall
}

/**
 * 6. Lấy danh sách phòng (không bao gồm ghế)
 */
const getHalls = async (queryParams) => {
  try {
    const { q, cinemaType, cinemaId, page, limit } = queryParams
    const filters = { q, cinemaType, cinemaId }

    const pageNum = parseInt(page) || 1
    const limitNum = parseInt(limit) || 10
    const skip = (pageNum - 1) * limitNum
    const pagination = { page: pageNum, limit: limitNum, skip }

    return await cinemaHallModel.getAll(filters, pagination)
  } catch (error) { throw new Error(error) }
}

export const cinemaHallService = {
  createNew,
  updateHall,
  updateSeat,
  deleteHall,
  getHallDetails,
  getHalls
}
