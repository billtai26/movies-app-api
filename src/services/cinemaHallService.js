import { cinemaHallModel } from '~/models/cinemaHallModel'

/**
 * 1. Thêm phòng chiếu (và tự động tạo ghế)
 */
const createNew = async (reqBody) => {
  try {
    const { name, cinemaType, seatLayout } = reqBody

    // --- Logic tự động tạo ghế ---
    let seats = []
    let totalSeats = 0
    const { rows, seatsPerRow, vipRows, coupleRows } = seatLayout

    for (const row of rows) { // Ví dụ: rows = ['A', 'B', 'C']
      for (let i = 1; i <= seatsPerRow; i++) {
        let seatType = 'standard'
        if (vipRows?.includes(row)) seatType = 'vip'
        if (coupleRows?.includes(row)) seatType = 'couple'

        seats.push({
          row: row,
          number: i,
          seatType: seatType,
          status: 'available' // Mặc định khi tạo
        })
        totalSeats++
      }
    }
    // --- Kết thúc logic tạo ghế ---

    const newHallData = {
      name,
      cinemaType,
      seats: seats,
      totalSeats: totalSeats
    }

    const createdHall = await cinemaHallModel.createNew(newHallData)
    // Trả về dữ liệu đầy đủ sau khi tạo
    return await cinemaHallModel.findOneById(createdHall.insertedId)
  } catch (error) { throw new Error(error.message) }
}

/**
 * 2. Sửa thông tin phòng (Tên, Loại)
 */
const updateHall = async (hallId, updateData) => {
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
    const { q, cinemaType, page, limit } = queryParams
    const filters = { q, cinemaType }

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
