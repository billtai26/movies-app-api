/**
 * Chuyển đổi chuỗi thành dạng slug
 * Ví dụ: "Phòng Chiếu 1" -> "phong-chieu-1"
 */
export const slugify = (val) => {
  if (!val) return ''
  return String(val)
    .normalize('NFKD') // Tách các ký tự có dấu thành ký tự gốc và dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu
    .trim() // Xóa khoảng trắng đầu cuối
    .toLowerCase() // Chuyển thành chữ thường
    .replace(/[^a-z0-9 -]/g, '') // Xóa các ký tự đặc biệt (trừ chữ, số, dấu gạch ngang)
    .replace(/\s+/g, '-') // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-') // Xóa các dấu gạch ngang liên tiếp
}

/**
 * Ví dụ thêm: Format tiền tệ VND
 */
export const formatCurrency = (number) => {
  if (!number) return '0 đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number)
}
