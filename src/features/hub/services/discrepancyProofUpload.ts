import { hubApi } from '../api/hubApi';
import { UntrustedUploadError } from '../../../services/errors/apiErrorMessages';

/**
 * Uploads a discrepancy proof photo (camera/gallery URI) to Cloudinary using a
 * backend-issued signed payload. Mirrors src/features/delivery/services/proofOfDeliveryUpload.ts —
 * unlike proof-of-delivery, there is no separate "attach" step: the resulting
 * secure URL is passed straight into hubApi.recordDiscrepancy's proofImageUrl field.
 */
export async function uploadDiscrepancyProof(
  hubId: string,
  inboundId: string,
  localUri: string,
): Promise<string> {
  const sig = await hubApi.getDiscrepancyProofUploadSignature(hubId, inboundId);

  const ext = localUri.split('.').pop()?.toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const filename = localUri.split('/').pop() ?? 'proof.jpg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
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
    throw new UntrustedUploadError(uploadData.error?.message ?? 'Tải ảnh bằng chứng sự cố thất bại.');
  }

  return uploadData.secure_url;
}
