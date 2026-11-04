// 공유용 VITAcode 결과 그림 (1080×1350, 인스타그램 세로 비율).
// 코드·별명·동물 그림 + 아래 앱 받기 줄(QR + 제목 + 짧은 주소 · 해시태그).
// 인스타그램·페이스북은 넘긴 글을 채워 주지 않아 그림에도 링크를 넣는다 (FormCoach app_link_footer 와 같은 방식).

import qrcode from 'qrcode-generator';

export type ShareCardInput = {
  code: string;
  nickname: string; // 유형 별명 (예: '활력 엔진형')
  codeIsLine: string; // '회원님의 VITAcode'
  animalSrc: string;
  footer: { link: string; title: string; short: string; hashtag: string } | null;
};

const W = 1080;
const H = 1350;
const FOOT = 250;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawQr(ctx: CanvasRenderingContext2D, data: string, x: number, y: number, size: number) {
  const qr = qrcode(0, 'M');
  qr.addData(data);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#111111';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, size: number, family: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 18 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
}

export async function renderVitaShareCard(input: ShareCardInput): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const bodyH = input.footer ? H - FOOT : H;

  // 배경 — 연보라 → 연초록
  const g = ctx.createLinearGradient(0, 0, W, bodyH);
  g.addColorStop(0, '#F3EEFF');
  g.addColorStop(1, '#E6F6EF');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, bodyH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#1C1917';
  ctx.font = `900 76px ${family}`;
  ctx.fillText('VITAcode', W / 2, 150);

  ctx.fillStyle = '#57534E';
  fitText(ctx, input.codeIsLine, W - 160, 700, 40, family);
  ctx.fillText(input.codeIsLine, W / 2, 230);

  // 동물 그림 — 폭 680 안에서 비율 유지, 높이는 440 까지, 둥근 모서리
  const animal = await loadImage(input.animalSrc);
  let y = 300;
  if (animal) {
    const scale = Math.min(680 / animal.width, 440 / animal.height);
    const aw = animal.width * scale;
    const ah = animal.height * scale;
    const ax = (W - aw) / 2;
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(ax, y, aw, ah, 40);
    else ctx.rect(ax, y, aw, ah); // iOS 15 사파리엔 roundRect 가 없다
    ctx.clip();
    ctx.drawImage(animal, ax, y, aw, ah);
    ctx.restore();
    y += ah;
  }

  ctx.fillStyle = '#1C1917';
  ctx.font = `900 150px ${family}`;
  ctx.fillText(input.code, W / 2, y + 190);

  ctx.fillStyle = '#6D28D9';
  fitText(ctx, input.nickname, W - 160, 800, 56, family);
  ctx.fillText(input.nickname, W / 2, y + 280);

  if (input.footer) {
    const f = input.footer;
    const top = bodyH;
    ctx.fillStyle = '#F3F6FA';
    ctx.fillRect(0, top, W, FOOT);
    ctx.fillStyle = '#D5DCE5';
    ctx.fillRect(0, top, W, 4);
    const pad = 36;
    const qrSize = FOOT - pad * 2;
    drawQr(ctx, f.link, pad, top + pad, qrSize);
    const left = pad * 2 + qrSize;
    const maxW = W - left - pad;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1B2A3A';
    fitText(ctx, f.title, maxW, 800, 52, family);
    ctx.fillText(f.title, left, top + FOOT / 2 - 8);
    ctx.fillStyle = '#4A5868';
    const sub = `${f.short}  ·  ${f.hashtag}`;
    fitText(ctx, sub, maxW, 600, 36, family);
    ctx.fillText(sub, left, top + FOOT / 2 + 48);
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
