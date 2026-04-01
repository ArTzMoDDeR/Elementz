import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function uploadToCloudinary(
  file: File,
  options: {
    folder?: string
    publicId?: string
    transformation?: object
  } = {}
): Promise<{ url: string; publicId: string }> {
  const { folder = 'elementz', publicId, transformation } = options

  // Convert File to buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          transformation,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'))
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            })
          }
        }
      )
      .end(buffer)
  })
}

export { cloudinary }
