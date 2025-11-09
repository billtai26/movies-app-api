import express from 'express'
import { voucherController } from '~/controllers/voucherController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware' // <-- Import admin
import { voucherValidation } from '~/validations/voucherValidation' // <-- Import validation mới

const Router = express.Router()

// Endpoint công khai để lấy danh sách voucher
Router.route('/')
  .get(voucherController.getActiveVouchers)

// Endpoint (bảo vệ) để user thử áp dụng voucher
Router.route('/apply')
  .post(protect, voucherController.testApplyVoucher)

// === Admin Routes (Mới) ===
// (Đặt các route của Admin lên trước)

// GET /v1/vouchers/admin (Lọc, Phân trang)
// POST /v1/vouchers/admin (Tạo mới)
Router.route('/admin')
  .get(protect, admin, voucherController.adminGetVouchers)
  .post(
    protect,
    admin,
    voucherValidation.adminCreateNew,
    voucherController.adminCreateVoucher
  )

// GET /v1/vouchers/admin/:id (Xem chi tiết)
// PATCH /v1/vouchers/admin/:id (Sửa)
// DELETE /v1/vouchers/admin/:id (Xoá)
Router.route('/admin/:id')
  .get(protect, admin, voucherController.adminGetVoucherDetails)
  .patch(
    protect,
    admin,
    voucherValidation.adminUpdate,
    voucherController.adminUpdateVoucher
  )
  .delete(protect, admin, voucherController.adminDeleteVoucher)

export const voucherRoute = Router
