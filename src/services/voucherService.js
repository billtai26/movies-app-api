import { voucherModel } from '~/models/voucherModel'

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

export const voucherService = {
  applyVoucher,
  getActiveVouchers
}
