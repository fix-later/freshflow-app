import { ENV } from '../config/env';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

export async function uploadImageToCloudinary(
  localUri: string,
  folder: string = 'freshflow/avatars',
): Promise<string> {
  const filename = localUri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  formData.append('upload_preset', ENV.CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  const data = (await res.json()) as CloudinaryUploadResponse & { error?: { message: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? 'Tải ảnh lên thất bại.');
  }

  return data.secure_url;
}
