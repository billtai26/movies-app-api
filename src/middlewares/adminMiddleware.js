import asyncHandler from 'express-async-handler'

const admin = asyncHandler(async (req, res, next) => {
  // Middleware `protect` phải được chạy TRƯỚC middleware này,
  // nên chúng ta sẽ luôn có req.user
  if (req.user && req.user.role === 'admin') {
    next() // User là admin, cho phép đi tiếp
  } else {
    res.status(403) // 403 Forbidden - Bị cấm truy cập
    throw new Error('Not authorized. Admin access required.')
  }
})

export { admin }
