import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { ApiError } from '~/utils/ApiError'

/**
 * Xử lý upload một file (buffer) lên Cloudinary
 */
const uploadFileToCloudinary = async (fileBuffer, folderName = 'movie-users') => {
  if (!fileBuffer) {
    throw new ApiError(400, 'No file buffer provided')
  }

  try {
    const result = await CloudinaryProvider.streamUpload(fileBuffer, folderName)
    // 'result' trả về từ Cloudinary chứa rất nhiều thông tin
    // Chúng ta chỉ cần 'secure_url' (link HTTPS) và 'public_id' (để xoá)
    return {
      url: result.secure_url,
      publicId: result.public_id
    }
  } catch (error) {
    throw new ApiError(500, `Cloudinary upload failed: ${error.message}`)
  }
}

export const uploadService = {
  uploadFileToCloudinary
}
