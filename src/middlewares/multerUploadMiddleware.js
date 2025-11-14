import multer from 'multer'
import { LIMIT_COMMON_FILE_SIZE, LIMIT_PDF_FILE_SIZE, ALLOW_COMMON_FILE_TYPES } from '~/utils/constants'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

/** Hầu hết những thứ bên dưới đều có ở docs của multer, chỉ là anh tổ chức lại sao cho khoa học và gọn gàng nhất có thể
 * https://www.npmjs.com/package/multer
 */

// Function Kiểm tra loại file nào được chấp nhận
const customFileFilter = (req, file, callback) => {
  // console.log('Multer File: ', file)

  // Đối với thằng multer, kiểm tra kiểu file thì sử dụng mimetype
  if (!ALLOW_COMMON_FILE_TYPES.includes(file.mimetype)) {
    const errMessage = 'File type is invalid. Only accept jpg, jpeg, png and pdf'
    return callback(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, errMessage), null)
  }
  // Nếu như kiểu file hợp lệ:
  return callback(null, true)
}

// Khởi tạo function upload được bọc bởi thằng multer
const fileSize = (req, file) => {
  return file.mimetype === 'application/pdf' ? LIMIT_PDF_FILE_SIZE : LIMIT_COMMON_FILE_SIZE
}

const memoryStorage = multer.memoryStorage()

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize },
  fileFilter: customFileFilter
})

export { upload }
