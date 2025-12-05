/* src/services/momoService.js */
import crypto from 'crypto'
import axios from 'axios'

class MomoService {
  constructor () {
    this.accessKey = 'F8BBA842ECF85'
    this.secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
    this.partnerCode = 'MOMO'

    // URL dev của bạn
    this.redirectUrl = 'http://localhost:5173/booking/confirm'
    this.ipnUrl = 'http://localhost:8017/v1/payments/momo/callback'
  }

  // Bỏ dấu tiếng Việt + ký tự lạ khỏi orderInfo
  removeVietnamese (str = '') {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
  }

  // Tạo thanh toán MoMo
  async createPayment (amount, orderInfoRaw = 'BookingMovie') {
    const orderInfo = this.removeVietnamese(orderInfoRaw)

    const requestId = `${this.partnerCode}${Date.now()}`
    const orderId = requestId
    const requestType = 'captureWallet'
    const extraData = ''

    // Chuỗi ký chữ ký
    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${this.ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${this.partnerCode}` +
      `&redirectUrl=${this.redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex')

    const body = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      orderId,
      amount: String(amount),
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      requestType,
      extraData,
      signature,
      lang: 'vi'
    }

    try {
      const res = await axios.post(
        'https://test-payment.momo.vn/v2/gateway/api/create',
        body,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      )

      console.log('✅ MoMo createPayment response:', res.data)
      return res.data
    } catch (err) {
      console.error('❌ MoMo createPayment ERROR:',
        err.response?.data || err.message || err)
      throw err
    }
  }

  // Verify callback
  verifySignature (response) {
    const {
      amount,
      extraData,
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
      signature
    } = response

    const rawSignature =
      `accessKey=${this.accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`

    const signed = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex')

    return signature === signed
  }

  async handlePaymentCallback (data) {
    const isValid = this.verifySignature(data)
    if (!isValid) throw new Error('Invalid MoMo signature')

    const resultCode = Number(data.resultCode); // hoặc String(...) === '0'

    return {
      success: resultCode === 0, 
      message: data.message,
      orderId: data.orderId,
      transId: data.transId,
      amount: Number(data.amount),
      data
    }
  }
}

export default new MomoService()
