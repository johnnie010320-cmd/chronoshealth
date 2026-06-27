// 음식 사진 → JPEG 다운스케일·압축 → base64(데이터URL 접두 제거).
// foodshot API 한도(base64 ≤ 512KB)에 맞도록 품질을 단계적으로 낮춤.
// /routine 상세 페이지와 홈 "오늘의 루틴" 탭이 공유.
export async function fileToFoodshotB64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('errPhoto'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('errPhoto'));
    el.src = dataUrl;
  });
  const maxDim = 1024;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('errPhoto');
  ctx.drawImage(img, 0, 0, width, height);
  const LIMIT = 512 * 1024;
  for (const quality of [0.8, 0.6, 0.45, 0.3, 0.2]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    const b64 = url.slice(url.indexOf(',') + 1);
    if (b64.length <= LIMIT) return b64;
  }
  throw new Error('errPhoto');
}
