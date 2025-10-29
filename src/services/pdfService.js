import PDFDocument from 'pdfkit'

class PDFService {
  async generateInvoicePDF(booking, movieDetails, showtimeDetails) {
    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        })

        // Array to store PDF chunks
        const chunks = []

        // Listen for data chunks
        doc.on('data', chunk => chunks.push(chunk))

        // Listen for end of document
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks)
          resolve(pdfBuffer)
        })

        // Add cinema logo and header (you can customize this)
        doc.fontSize(20)
          .text('Movie Ticket Invoice', { align: 'center' })
          .moveDown()

        // Add booking details
        doc.fontSize(12)
          .text(`Booking ID: ${booking._id}`)
          .text(`Date: ${new Date(booking.createdAt).toLocaleString()}`)
          .text(`Payment Status: ${booking.paymentStatus}`)
          .moveDown()

        // Add movie details
        if (movieDetails) {
          doc.fontSize(14)
            .text('Movie Details', { underline: true })
            .fontSize(12)
            .text(`Title: ${movieDetails.title || 'N/A'}`)
            .text(`Duration: ${movieDetails.duration || 'N/A'} minutes`)
            .moveDown()
        }

        // Add showtime details
        if (showtimeDetails) {
          doc.fontSize(14)
            .text('Showtime Details', { underline: true })
            .fontSize(12)
            .text(`Date: ${new Date(showtimeDetails.startTime).toLocaleDateString()}`)
            .text(`Time: ${new Date(showtimeDetails.startTime).toLocaleTimeString()}`)
            .text(`Theater: ${showtimeDetails.theaterId || 'N/A'}`)
            .moveDown()
        }

        // Add seats
        doc.fontSize(14)
          .text('Seats', { underline: true })
          .fontSize(12)
        booking.seats.forEach(seat => {
          // SỬA LẠI DÒNG NÀY: Truy cập vào thuộc tính của seat
          doc.text(`Row: ${seat.row}, Number: ${seat.number}`)
        })
        doc.moveDown()

        // Add combos if any
        if (booking.combos && booking.combos.length > 0) {
          doc.fontSize(14)
            .text('Combos', { underline: true })
            .fontSize(12)
          booking.combos.forEach(combo => {
            doc.text(`${combo.name} x${combo.quantity || 1} - ${combo.price || 0}đ`)
          })
          doc.moveDown()
        }

        // Add total amount
        doc.fontSize(16)
          .text(`Total Amount: ${booking.totalAmount}đ`, { underline: true })
          .moveDown()

        // Add footer
        doc.fontSize(10)
          .text('Thank you for choosing our cinema!', { align: 'center' })
          .text('Please arrive 15 minutes before showtime.', { align: 'center' })

        // Finalize the PDF
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }
}

export default new PDFService()