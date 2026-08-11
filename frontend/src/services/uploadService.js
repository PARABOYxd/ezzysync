import api from './api';

/**
 * Uploads a single file and resolves its public URL. Shared by the settings
 * logo picker and the quotation banner picker, which both post the same
 * multipart 'file' field to /upload.
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
