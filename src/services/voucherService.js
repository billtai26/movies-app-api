import { voucherModel } from '~/models/voucherModel'
import { ApiError } from '~/utils/ApiError'

/**
 * Áp dụng voucher và tính toán giảm giá
 * @param {string} voucherCode - Mã voucher
 * @param {number} originalAmount - Giá gốc của đơn hàng
 * @returns {object} { discount, finalAmount, error }
 */
const applyVoucher = async (voucherCode, originalAmount) => {
  const voucher = await voucherModel.findByCode(voucherCode)

  // Kiểm tra Voucher
  if (!voucher) {
    return { error: 'Invalid voucher code' }
  }
  if (new Date() > new Date(voucher.expiresAt)) {
    return { error: 'Voucher has expired' }
  }
  if (voucher.usageCount >= voucher.usageLimit) {
    return { error: 'Voucher has reached its usage limit' }
  }
  if (originalAmount < voucher.minOrderAmount) {
    return { error: `Order must be at least ${voucher.minOrderAmount} to use this voucher` }
  }

  // Tính toán giảm giá
  let discount = 0
  if (voucher.discountType === 'fixed') {
    discount = voucher.discountValue
  } else if (voucher.discountType === 'percent') {
    discount = (originalAmount * voucher.discountValue) / 100
    if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
      discount = voucher.maxDiscountAmount
    }
  }

  const finalAmount = Math.max(0, originalAmount - discount) // Đảm bảo không âm

  return {
    voucher, // Trả về voucher để lát nữa tăng usageCount
    discount,
    finalAmount
  }
}

const getActiveVouchers = async () => {
  return await voucherModel.getActiveVouchers()
}

/**
 * HÀM MỚI: (Admin) Tạo voucher
 */
const adminCreateVoucher = async (reqBody) => {
  // 1. Check trùng code
  const existingVoucher = await voucherModel.adminFindByCode(reqBody.code)
  if (existingVoucher) {
    throw new ApiError(400, 'Voucher code already exists')
  }

  // 2. Tạo mới
  // (Đảm bảo logic: nếu là 'percent', maxDiscountAmount phải có)
  if (reqBody.discountType === 'percent' && !reqBody.maxDiscountAmount) {
    throw new ApiError(400, 'maxDiscountAmount is required for percent discount type')
  }

  const newVoucherResult = await voucherModel.createNew(reqBody)
  return await voucherModel.findOneById(newVoucherResult.insertedId)
}

/**
 * HÀM MỚI: (Admin) Lấy danh sách (Lọc, Phân trang)
 */
const adminGetVouchers = async (queryParams) => {
  const { q, isActive, page, limit } = queryParams

  const filters = { q, isActive: isActive }

  const pageNum = parseInt(page) || 1
  const limitNum = parseInt(limit) || 10
  const skip = (pageNum - 1) * limitNum
  const pagination = { page: pageNum, limit: limitNum, skip }

  return await voucherModel.adminGetAll(filters, pagination)
}

/**
 * HÀM MỚI: (Admin) Lấy chi tiết 1 voucher
 */
const adminGetVoucherDetails = async (voucherId) => {
  const voucher = await voucherModel.findOneById(voucherId)
  if (!voucher) {
    throw new ApiError(404, 'Voucher not found')
  }
  return voucher
}

/**
 * HÀM MỚI: (Admin) Sửa 1 voucher
 */
const adminUpdateVoucher = async (voucherId, updateData) => {
  // (Không cho phép sửa code)
  delete updateData.code

  const updatedVoucher = await voucherModel.adminUpdate(voucherId, updateData)
  if (!updatedVoucher) {
    throw new ApiError(404, 'Voucher not found or update failed')
  }
  return updatedVoucher
}

/**
 * HÀM MỚI: (Admin) Xoá 1 voucher
 */
const adminDeleteVoucher = async (voucherId) => {
  const voucher = await voucherModel.findOneById(voucherId)
  if (!voucher) {
    throw new ApiError(404, 'Voucher not found')
  }

  await voucherModel.adminSoftDelete(voucherId)
  return { message: 'Voucher soft deleted successfully' }
}

export const voucherService = {
  // User
  applyVoucher,
  getActiveVouchers,
  // Admin
  adminCreateVoucher,
  adminGetVouchers,
  adminGetVoucherDetails,
  adminUpdateVoucher,
  adminDeleteVoucher
}
