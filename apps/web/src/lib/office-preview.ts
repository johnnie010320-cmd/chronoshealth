// 대화 첨부 Office 파일의 브라우저 내 미리보기 렌더러.
// mammoth(docx)·SheetJS(xlsx/xls)로 "클라이언트에서만" HTML 로 변환한다 — 파일 바이트가
// 외부(제3자 뷰어)로 전송되지 않는다(ADR 0003 / 데이터 주권 준수). 결과 HTML 은 호출부에서
// sandbox iframe(srcdoc, 스크립트 차단)에 넣어 격리 렌더한다.
//
// mammoth/xlsx 는 동적 import 로 불러오므로 초기 번들·LCP 에 영향이 없다(첨부를 실제로
// 미리볼 때만 청크가 로드된다).

export type PreviewMode = 'image' | 'pdf' | 'office' | 'unsupported';

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

// 파일명·MIME 으로 미리보기 방식 결정.
// office = docx/xlsx/xls (브라우저 내 렌더). ppt/pptx·레거시 doc·기타 = unsupported(안내+다운로드).
export function previewMode(name: string, type: string): PreviewMode {
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  const ext = extOf(name);
  if (ext === 'docx' || ext === 'xlsx' || ext === 'xls') return 'office';
  return 'unsupported';
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

// 변환 결과 본문을 sandbox iframe 에 넣을 완결 HTML 문서로 감싼다.
// 문서형 뷰라 흰 종이 배경 고정(라이트/다크 무관하게 가독) — color-scheme: light.
function wrapDoc(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 16px; background: #fff; color: #1c1917;
    font: 14px/1.6 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif;
    -webkit-text-size-adjust: 100%; word-break: break-word; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 0 0 16px; }
  td, th { border: 1px solid #d6d3d1; padding: 4px 8px; text-align: left; vertical-align: top; }
  h1, h2, h3 { line-height: 1.3; }
  h2.sheet { margin: 20px 0 8px; font-size: 15px; color: #0f766e; }
  p { margin: 0 0 10px; }
  a { color: #0f766e; }
</style></head><body>${body}</body></html>`;
}

// docx/xlsx/xls → sandbox iframe 에 넣을 완결 HTML 문서 문자열.
// 지원하지 않는 확장자를 넘기면 예외(호출부에서 실패 처리).
export async function renderOfficeHtml(name: string, bytes: ArrayBuffer): Promise<string> {
  const ext = extOf(name);
  if (ext === 'docx') {
    const { convertToHtml } = await import('mammoth');
    const result = await convertToHtml({ arrayBuffer: bytes });
    return wrapDoc(result.value || '');
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const { read, utils } = await import('xlsx');
    const wb = read(bytes, { type: 'array' });
    const body = wb.SheetNames.map((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const table = ws ? utils.sheet_to_html(ws, { editable: false }) : '';
      return `<h2 class="sheet">${escapeHtml(sheetName)}</h2>${table}`;
    }).join('');
    return wrapDoc(body);
  }
  throw new Error('UNSUPPORTED_OFFICE_EXT');
}
