import QRCode from 'qrcode'

class QRService {
  async generateQRCode(data) {
    try {
      // Generate QR code as a data URL
      const qrCode = await QRCode.toDataURL(data)
      return qrCode
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`)
    }
  }
}

export default new QRService()