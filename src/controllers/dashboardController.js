import { dashboardService } from '~/services/dashboardService'

const getOverviewStats = async (req, res, next) => {
  try {
    const result = await dashboardService.getOverviewStats(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

const getRevenueChartData = async (req, res, next) => {
  try {
    const result = await dashboardService.getRevenueChartData(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

const getTopPerformers = async (req, res, next) => {
  try {
    const result = await dashboardService.getTopPerformers()
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const dashboardController = {
  getOverviewStats,
  getRevenueChartData,
  getTopPerformers
}
