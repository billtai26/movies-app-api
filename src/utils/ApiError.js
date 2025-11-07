/**
 * Lớp Error tùy chỉnh để mang theo statusCode
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    // Gọi hàm khởi tạo của lớp cha (Error) với message
    super(message)

    // Gán statusCode
    this.statusCode = statusCode
  }
}

export { ApiError }
