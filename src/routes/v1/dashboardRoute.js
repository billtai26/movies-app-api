import express from 'express'
import { dashboardController } from '~/controllers/dashboardController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

/**
 * GET /v1/dashboard/overview
 * Lấy các thẻ số liệu
 * Query params: ?timeframe=today (hoặc 'week', 'month')
 */
Router.route('/overview')
  .get(protect, admin, dashboardController.getOverviewStats)

/**
 * GET /v1/dashboard/revenue-chart
 * Lấy dữ liệu biểu đồ doanh thu
 * Query params: ?days=30 (hoặc 7, 90)
 */
Router.route('/revenue-chart')
  .get(protect, admin, dashboardController.getRevenueChartData)

/**
 * GET /v1/dashboard/top-performers
 * Lấy Top 5 phim và user
 */
Router.route('/top-performers')
  .get(protect, admin, dashboardController.getTopPerformers)

export const dashboardRoute = Router
