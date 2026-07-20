import { driverApi } from '../api/driverApi';

/**
 * Uploads a proof-of-delivery asset (camera photo URI or signature-canvas PNG
 * data URL) to Cloudinary using a backend-issued signed payload, then attaches
 * the resulting secure URL to the delivery record.
 *
 * Mirrors the unsigned flow in src/services/cloudinaryUpload.ts, but proof-of-
 * delivery uploads must go through the backend's signed `upload-signature`
 * endpoint (see driverApi.getProofUploadSignature).
 */
export async function uploadProofOfDelivery(deliveryId: string, localUri: string): Promise<string> {
  const sig = await driverApi.getProofUploadSignature(deliveryId);

  const isDataUrl = localUri.startsWith('data:');

  const formData = new FormData();
  if (isDataUrl) {
    // Signature capture produces a base64 data: URL. React Native's fetch/FormData
    // only resolves `{ uri, name, type }` against real file:// (or content://) paths —
    // a data: URI passed that way is not decoded as file content. Cloudinary's upload
    // API accepts a base64 data URI directly as a plain string field, so send it as-is.
    formData.append('file', localUri);
  } else {
    const ext = localUri.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const filename = localUri.split('/').pop() ?? 'proof.jpg';
    formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  }
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', String(sig.timestamp));
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const uploadData = (await res.json()) as { secure_url: string; error?: { message: string } };
  if (!res.ok) {
    throw new Error(uploadData.error?.message ?? 'Tải bằng chứng giao hàng thất bại.');
  }

  await driverApi.attachProofOfDelivery(deliveryId, uploadData.secure_url);
  return uploadData.secure_url;
}
