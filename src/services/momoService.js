import crypto from 'crypto'
import https from 'https'

class MomoService {
  constructor() {
    this.accessKey = 'F8BBA842ECF85'
    this.secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
    this.partnerCode = 'MOMO'
    this.redirectUrl = 'https://webhook.site/d0a78b9e-f6e5-4739-b5df-ac58d140be01'
    this.ipnUrl = 'https://webhook.site/d0a78b9e-f6e5-4739-b5df-ac58d140be01'
  }

  async createPayment(amount, orderInfo = 'Pay with MoMo') {
    const requestId = this.partnerCode + new Date().getTime()
    const orderId = requestId
    const requestType = 'payWithMethod'
    const extraData = ''
    const orderGroupId = ''
    const autoCapture = true
    const lang = 'vi'

    // Create raw signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${requestType}`

    // Create signature
    const signature = crypto.createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex')

    // Create request body
    const requestBody = JSON.stringify({
      partnerCode: this.partnerCode,
      partnerName: 'Test',
      storeId: 'MomoTestStore',
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: lang,
      requestType: requestType,
      autoCapture: autoCapture,
      extraData: extraData,
      orderGroupId: orderGroupId,
      signature: signature
    })

    // Create request options
    const options = {
      hostname: 'test-payment.momo.vn',
      port: 443,
      path: '/v2/gateway/api/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }

    // Return promise for async/await usage
    return new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let data = ''

        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const response = JSON.parse(data)
            resolve(response)
          } catch (error) {
            reject(error)
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(requestBody)
      req.end()
    })
  }

  async verifySignature(response) {
    const {
      // eslint-disable-next-line no-unused-vars
      accessKey,
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

    // Build raw signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`

    // Generate signature
    const generatedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex')

    // Compare signatures
    return signature === generatedSignature
  }

  async handlePaymentCallback(response) {
    try {
      // Verify the signature first
      const isValidSignature = await this.verifySignature(response)
      if (!isValidSignature) {
        throw new Error('Invalid signature from MoMo')
      }

      const {
        resultCode,
        orderId,
        amount,
        transId,
        orderInfo,
        message
      } = response

      // Parse the orderId to get the booking reference if needed
      // In our case, orderId = partnerCode + timestamp
      // You might want to store this mapping in your database

      // Prepare the result object
      const result = {
        success: resultCode === 0,
        orderId,
        amount: parseInt(amount),
        transactionId: transId,
        orderInfo,
        message,
        responseCode: resultCode,
        responseData: response
      }

      // Return processed result
      return result
    } catch (error) {
      throw new Error(`Payment callback processing failed: ${error.message}`)
    }
  }
}

export default new MomoService()