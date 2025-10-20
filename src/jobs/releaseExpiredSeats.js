/* eslint-disable no-console */
import cron from 'node-cron'
import { GET_DB } from '~/config/mongodb'

const SHOWTIME_COLLECTION_NAME = 'showtimes'

// Hàm tìm và hủy các ghế đã hết hạn giữ
const releaseSeats = async () => {
  console.log('Running a job to release expired held seats...')

  const filter = {
    'seats.status': 'held',
    'seats.heldUntil': { $lt: new Date() } // Tìm ghế có thời gian giữ đã qua
  }

  const update = {
    $set: {
      'seats.$[elem].status': 'available',
      'seats.$[elem].heldBy': null,
      'seats.$[elem].heldUntil': null
    }
  }

  const options = {
    arrayFilters: [{
      'elem.status': 'held',
      'elem.heldUntil': { $lt: new Date() }
    }]
  }

  try {
    const result = await GET_DB().collection(SHOWTIME_COLLECTION_NAME).updateMany(filter, update, options)
    if (result.modifiedCount > 0) {
      console.log(`Released ${result.modifiedCount} expired seats.`)
    }
  } catch (error) {
    console.error('Error releasing expired seats:', error)
  }
}

// Lên lịch chạy job này mỗi phút
export const startReleaseSeatsJob = () => {
  cron.schedule('*/1 * * * *', releaseSeats) // Chạy mỗi phút
}