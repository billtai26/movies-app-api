import { GET_DB } from '~/config/mongodb'
// import { ApiError } from '~/utils/ApiError'
// import { ObjectId } from 'mongodb'

/**
 * HÀM NỘI BỘ: Lấy khoảng thời gian (startDate, endDate)
 * Mặc định là 'today' (hôm nay)
 */
const _getDashboardDateRange = (timeframe = 'today') => {
  const now = new Date() // Giờ VN (do server setting)
  let startDate, endDate

  if (timeframe === 'today') {
    startDate = new Date(now.setHours(0, 0, 0, 0))
    endDate = new Date(now.setHours(23, 59, 59, 999))
  } else if (timeframe === 'week') {
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Bắt đầu từ T2
    startDate = new Date(now.setDate(diff))
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(startDate) // Bắt đầu của tuần
    endDate.setDate(startDate.getDate() + 6) // Cuối tuần (CN)
    endDate.setHours(23, 59, 59, 999)
  } else if (timeframe === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1) // Ngày đầu tháng
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Ngày cuối tháng
    endDate.setHours(23, 59, 59, 999)
  } else {
    // Mặc định là hôm nay
    startDate = new Date(now.setHours(0, 0, 0, 0))
    endDate = new Date(now.setHours(23, 59, 59, 999))
  }

  return { startDate, endDate }
}

/**
 * 1. Lấy Thẻ số liệu Tổng quan (Overview Stats)
 */
const getOverviewStats = async (queryParams) => {
  const { timeframe } = queryParams
  const { startDate, endDate } = _getDashboardDateRange(timeframe)

  // 1. Tính Doanh thu & Vé bán
  const revenuePromise = GET_DB().collection('bookings').aggregate([
    {
      $match: {
        paymentStatus: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalBookings: { $sum: 1 }
      }
    }
  ]).toArray()

  // 2. Tính User mới
  const usersPromise = GET_DB().collection('users').countDocuments({
    createdAt: { $gte: startDate, $lte: endDate }
  })

  // 3. Lấy tổng số phim đang chiếu
  const moviesPromise = GET_DB().collection('movies').countDocuments({
    status: 'now_showing',
    _destroy: false
  })

  // Chạy song song 3 truy vấn
  const [revenueResult, newUsers, totalMovies] = await Promise.all([
    revenuePromise,
    usersPromise,
    moviesPromise
  ])

  const stats = revenueResult[0] || { totalRevenue: 0, totalBookings: 0 }

  return {
    totalRevenue: stats.totalRevenue,
    totalBookings: stats.totalBookings,
    newUsers: newUsers,
    totalMovies: totalMovies,
    timeframe: { startDate, endDate }
  }
}

/**
 * 2. Lấy dữ liệu Biểu đồ Doanh thu (Revenue Chart)
 */
const getRevenueChartData = async (queryParams) => {
  const days = parseInt(queryParams.days) || 30 // Mặc định 30 ngày

  // Lấy mốc 30 ngày trước
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  // 1. Lấy tất cả các ngày trong 30 ngày qua
  // (Code này đảm bảo các ngày không có doanh thu vẫn hiển thị là 0)
  let dateArray = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    // Format: YYYY-MM-DD
    const dateString = d.toISOString().split('T')[0]
    dateArray.push({ date: dateString, revenue: 0 })
  }

  // 2. Aggregate doanh thu
  const revenueData = await GET_DB().collection('bookings').aggregate([
    {
      $match: {
        paymentStatus: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        // Gom nhóm theo NGÀY (theo múi giờ VN +07:00)
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone: '+07:00'
          }
        },
        dailyRevenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]).toArray()

  // 3. Map doanh thu vào mảng ngày
  const revenueMap = new Map(revenueData.map(item => [item._id, item.dailyRevenue]))

  const chartData = dateArray.map(item => ({
    ...item,
    revenue: revenueMap.get(item.date) || 0
  }))

  return chartData
}

/**
 * 3. Lấy Top 5 (Phim, Cụm rạp, User)
 */
const getTopPerformers = async () => {
  const limit = 5

  // 1. Top 5 Phim (theo doanh thu)
  const topMoviesPromise = GET_DB().collection('bookings').aggregate([
    { $match: { paymentStatus: 'completed', _destroy: false } },
    { $group: {
      _id: '$movieId',
      totalRevenue: { $sum: '$totalAmount' },
      ticketsSold: { $sum: 1 }
    } },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    { $lookup: {
      from: 'movies',
      localField: '_id',
      foreignField: '_id',
      as: 'movieDetails'
    } },
    { $unwind: '$movieDetails' },
    { $project: {
      _id: 1,
      title: '$movieDetails.title',
      posterUrl: '$movieDetails.posterUrl',
      totalRevenue: 1,
      ticketsSold: 1
    } }
  ]).toArray()

  // 2. Top 5 User (theo chi tiêu)
  const topUsersPromise = GET_DB().collection('bookings').aggregate([
    { $match: { paymentStatus: 'completed', _destroy: false } },
    { $group: {
      _id: '$userId',
      totalSpent: { $sum: '$totalAmount' },
      totalBookings: { $sum: 1 }
    } },
    { $sort: { totalSpent: -1 } },
    { $limit: limit },
    { $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'userDetails'
    } },
    { $unwind: '$userDetails' },
    { $project: {
      _id: 1,
      name: '$userDetails.username',
      email: '$userDetails.email',
      totalSpent: 1,
      totalBookings: 1
    } }
  ]).toArray()

  // Chạy song song
  const [topMovies, topUsers] = await Promise.all([
    topMoviesPromise,
    topUsersPromise
  ])

  return { topMovies, topUsers }
}


export const dashboardService = {
  getOverviewStats,
  getRevenueChartData,
  getTopPerformers
}
