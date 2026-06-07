'use client';

// 클라이언트 측 이미지 리사이즈 — 프로필 사진 업로드 전 처리.
// File → HTMLCanvas → JPEG dataURL (정사각 center-crop).
// 입력은 어떤 비율이든 받고, 출력은 size×size 정사각.
export async function resizeImageToDataUrl(
  file: File,
  size = 256,
  quality = 0.85,
): Promise<{ mimeType: 'image/jpeg'; dataB64: string }> {
  const bitmap = await loadBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');

  // center-crop: 원본의 가장 짧은 변을 기준으로 정사각으로 자른 뒤 size 로 축소.
  const minSide = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - minSide) / 2;
  const sy = (bitmap.height - minSide) / 2;
  ctx.drawImage(bitmap, sx, sy, minSide, minSide, 0, 0, size, size);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  // dataUrl = "data:image/jpeg;base64,XXXX..."
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx < 0) throw new Error('CANVAS_ENCODE_FAILED');
  const dataB64 = dataUrl.slice(commaIdx + 1);
  return { mimeType: 'image/jpeg', dataB64 };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  // 폴백 — 구형 브라우저.
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('IMG_LOAD_FAILED'));
    };
    img.src = url;
  });
}
