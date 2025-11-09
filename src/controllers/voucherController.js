import { voucherService } from '~/services/voucherService'

const getActiveVouchers = async (req, res, next) => {
  try {
    const vouchers = await voucherService.getActiveVouchers()
    res.status(200).json(vouchers)
  } catch (error) {
    next(error)
  }
}

// API này chỉ để user "thử" áp dụng voucher xem được giảm bao nhiêu
const testApplyVoucher = async (req, res, next) => {
  try {
    const { voucherCode, amount } = req.body
    if (!voucherCode || !amount) {
      return res.status(400).json({ errors: 'voucherCode and amount are required' })
    }
    const result = await voucherService.applyVoucher(voucherCode, amount)

    if (result.error) {
      return res.status(400).json({ errors: result.error })
    }

    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) GET /admin
 */
const adminGetVouchers = async (req, res, next) => {
  try {
    const result = await voucherService.adminGetVouchers(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) POST /admin
 */
const adminCreateVoucher = async (req, res, next) => {
  try {
    const voucher = await voucherService.adminCreateVoucher(req.body)
    res.status(201).json(voucher)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) GET /admin/:id
 */
const adminGetVoucherDetails = async (req, res, next) => {
  try {
    const voucher = await voucherService.adminGetVoucherDetails(req.params.id)
    res.status(200).json(voucher)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) PATCH /admin/:id
 */
const adminUpdateVoucher = async (req, res, next) => {
  try {
    const voucher = await voucherService.adminUpdateVoucher(req.params.id, req.body)
    res.status(200).json(voucher)
  } catch (error) {
    next(error)
  }
}

/**
 * HÀM MỚI: (Admin) DELETE /admin/:id
 */
const adminDeleteVoucher = async (req, res, next) => {
  try {
    const result = await voucherService.adminDeleteVoucher(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const voucherController = {
  // User
  getActiveVouchers,
  testApplyVoucher,
  // Admin
  adminGetVouchers,
  adminCreateVoucher,
  adminGetVoucherDetails,
  adminUpdateVoucher,
  adminDeleteVoucher
}
