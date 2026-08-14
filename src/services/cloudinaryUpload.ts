// Signed Cloudinary upload — the API key/secret live server-side; the client only ever
// gets a short-lived signature via a BE `.../upload-signature` endpoint (see profileApi
// .getAvatarUploadSignature / restaurantApi.getLicenseUploadSignature). Mirrors the
// working pattern in features/delivery/services/proofOfDeliveryUpload.ts — do not fall
// back to an unsigned upload_preset; that path has been retired.
import { UntrustedUploadError } from './errors/apiErrorMessages';
export interface CloudinaryUploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

export async function uploadImageToCloudinary(
  localUri: string,
  signature: CloudinaryUploadSignature,
): Promise<string> {
  const filename = localUri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: 'POST', body: formData },
  );

  const data = (await res.json()) as CloudinaryUploadResponse & { error?: { message: string } };
  if (!res.ok) {
    throw new UntrustedUploadError(data.error?.message ?? 'Tải ảnh lên thất bại.');
  }

  return data.secure_url;
}
