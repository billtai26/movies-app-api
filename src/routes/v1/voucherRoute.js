import express from 'express'
import { voucherController } from '~/controllers/voucherController'
import { protect } from '~/middlewares/authMiddleware'
// import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// Endpoint công khai để lấy danh sách voucher
Router.route('/')
  .get(voucherController.getActiveVouchers)

// Endpoint (bảo vệ) để user thử áp dụng voucher
Router.route('/apply')
  .post(protect, voucherController.testApplyVoucher)

// (Thêm các route cho Admin để tạo/sửa/xóa voucher nếu cần)

export const voucherRoute = Router
