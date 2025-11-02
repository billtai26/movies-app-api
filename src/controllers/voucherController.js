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

export const voucherController = {
  getActiveVouchers,
  testApplyVoucher
  // (Thêm các hàm CRUD cho Admin nếu cần)
}
