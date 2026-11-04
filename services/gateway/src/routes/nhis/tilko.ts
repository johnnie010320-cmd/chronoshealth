// 틸코(Tilko) 간편인증 중개 — 국민건강보험공단 건강검진 실연동 공급자.
// 공식 샘플(Tilkoblet/Tilko_Php) 규약 그대로 구현:
//   STEP0 GET  {host}/api/Auth/GetPublicKey?APIkey=KEY            → PublicKey(SPKI base64)
//   STEP1 POST {host}/api/v1.0/NhisSimpleAuth/SimpleAuthRequest   → ResultData(간편인증 토큰) · 사용자 인증앱 톡 발송
//   STEP2 POST {host}/api/v1.0/NhisSimpleAuth/Ggpab003M0105       → ResultList(건강검진, 평문)
// 헤더: API-Key, ENC-Key(base64 RSA/PKCS1-v1.5(AES키)). 본문 PII는 AES-128-CBC(IV=0)로 암호화.
// 호출마다 새 AES키/ENC-Key 생성(공식 샘플과 동일).

import type { Bindings } from '../../bindings.js';
import type {
  AuthHandle,
  AuthProviderKind,
  AuthRequestInput,
  CheckupData,
  NhisProvider,
} from './provider.js';
import { aesEncryptB64, randomAesKey, rsaPkcs1v15EncryptB64 } from './tilko-crypto.js';

export const NHIS_NOT_CONFIGURED = 'NHIS_NOT_CONFIGURED';

// 간편인증 수단 → 틸코 PrivateAuthType 코드.
const AUTH_TYPE_CODE: Record<AuthProviderKind, string> = {
  kakao: '0',
  payco: '1',
  samsung: '2',
  kb: '3',
  pass: '4', // 통신사 PASS
  naver: '5',
  shinhan: '6',
};

type TilkoResp = {
  Status?: string;
  ErrorCode?: number;
  Message?: string;
  ResultData?: Record<string, string>;
  ResultList?: unknown;
};

export class TilkoProvider implements NhisProvider {
  readonly id = 'tilko';
  readonly live = true;
  private readonly apiKey: string;
  private readonly host: string;

  constructor(env: Bindings) {
    this.apiKey = env.TILKO_API_KEY ?? '';
    this.host = (env.TILKO_API_HOST ?? 'https://api.tilko.net').replace(/\/+$/, '');
  }

  private async getPublicKey(): Promise<string> {
    const res = await fetch(
      `${this.host}/api/Auth/GetPublicKey?APIkey=${encodeURIComponent(this.apiKey)}`,
    );
    const j = (await res.json()) as { PublicKey?: string };
    if (!res.ok || !j.PublicKey) throw new Error('NHIS_UPSTREAM_ERROR');
    return j.PublicKey;
  }

  // 호출용 암호 세션(공개키 → AES키 → ENC-Key).
  private async session(): Promise<{ aesKey: Uint8Array; headers: Record<string, string> }> {
    const pub = await this.getPublicKey();
    const aesKey = randomAesKey();
    const encKey = await rsaPkcs1v15EncryptB64(pub, aesKey);
    return {
      aesKey,
      headers: {
        'Content-Type': 'application/json',
        'API-Key': this.apiKey,
        'ENC-Key': encKey,
      },
    };
  }

  async requestAuth(input: AuthRequestInput): Promise<AuthHandle> {
    if (!this.apiKey) throw new Error(NHIS_NOT_CONFIGURED);
    const { aesKey, headers } = await this.session();
    const body = {
      PrivateAuthType: AUTH_TYPE_CODE[input.provider],
      UserName: await aesEncryptB64(aesKey, input.name),
      BirthDate: await aesEncryptB64(aesKey, input.birthDate),
      UserCellphoneNumber: await aesEncryptB64(aesKey, input.phone),
    };
    const res = await fetch(`${this.host}/api/v1.0/NhisSimpleAuth/SimpleAuthRequest`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as TilkoResp;
    if (j.ErrorCode !== 0 || !j.ResultData) {
      throw new Error(`NHIS_AUTH_FAILED:${j.Message ?? ''}`);
    }
    const rd = j.ResultData;
    // STEP2 로 넘길 간편인증 토큰 + (재암호화에 필요한) 원본 PII. 서버 미보관, 클라이언트 왕복.
    return {
      CxId: rd.CxId ?? '',
      PrivateAuthType: rd.PrivateAuthType ?? AUTH_TYPE_CODE[input.provider],
      ReqTxId: rd.ReqTxId ?? '',
      Token: rd.Token ?? '',
      TxId: rd.TxId ?? '',
      UserName: input.name,
      BirthDate: input.birthDate,
      UserCellphoneNumber: input.phone,
    };
  }

  async fetchCheckup(handle: AuthHandle): Promise<CheckupData[]> {
    if (!this.apiKey) throw new Error(NHIS_NOT_CONFIGURED);
    const { aesKey, headers } = await this.session();
    const body = {
      CxId: handle.CxId ?? '',
      PrivateAuthType: handle.PrivateAuthType ?? '',
      ReqTxId: handle.ReqTxId ?? '',
      Token: handle.Token ?? '',
      TxId: handle.TxId ?? '',
      UserName: await aesEncryptB64(aesKey, handle.UserName ?? ''),
      BirthDate: await aesEncryptB64(aesKey, handle.BirthDate ?? ''),
      UserCellphoneNumber: await aesEncryptB64(aesKey, handle.UserCellphoneNumber ?? ''),
    };
    const res = await fetch(`${this.host}/api/v1.0/NhisSimpleAuth/Ggpab003M0105`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const j = (await res.json()) as TilkoResp;
    if (j.ErrorCode !== 0) {
      // 사용자가 아직 인증앱에서 승인하지 않았거나 시간 초과 등.
      throw new Error(`NHIS_FETCH_FAILED:${j.Message ?? ''}`);
    }
    return parseCheckups(j);
  }
}

// ── 응답(건강검진) 파싱 — ResultList[].Inspections[].Illnesses[].Items[]{Name,Value,Unit} (평문) ──

type Item = { Name?: string; Value?: string; Unit?: string };
type NhisRecord = {
  Year?: string;
  CheckUpDate?: string;
  Inspections?: { Illnesses?: { Items?: Item[] }[] }[];
};

function recordItems(rec: NhisRecord): Item[] {
  const items: Item[] = [];
  for (const insp of rec.Inspections ?? []) {
    for (const ill of insp.Illnesses ?? []) {
      for (const it of ill.Items ?? []) items.push(it);
    }
  }
  return items;
}

function iso8(d8: string): string {
  return `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}`;
}

// 공단 응답은 Year(검진년도)와 CheckUpDate(월일 등)가 분리될 수 있어 합쳐서 날짜 산출.
function combineDate(year?: string, checkUp?: string): string {
  const y = String(year ?? '').replace(/\D/g, '');
  const c = String(checkUp ?? '').replace(/\D/g, '');
  if (c.length >= 8) return iso8(c.slice(0, 8)); // YYYYMMDD
  if (y.length === 4 && c.length > 0 && c.length <= 4) return iso8(y + c.padStart(4, '0')); // YYYY + MMDD
  if (y.length === 4) return `${y}-01-01`;
  if (c.length === 4) return `${c}-01-01`;
  return String(checkUp ?? year ?? '');
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function parseRecord(rec: NhisRecord): CheckupData {
  const items = recordItems(rec);
  const find = (...keys: string[]): Item | undefined =>
    items.find((it) => keys.some((k) => (it.Name ?? '').replace(/\s/g, '').includes(k)));
  const val = (...keys: string[]): number | null => num(find(...keys)?.Value);

  // 혈압: 분리(수축기/이완기) 우선, 없으면 "혈압" 단일값 "120/80" 분해.
  let systolic = val('수축기');
  let diastolic = val('이완기');
  if (systolic == null && diastolic == null) {
    const bp = find('혈압');
    const parts = (bp?.Value ?? '').split('/');
    if (parts.length === 2) {
      systolic = num(parts[0]);
      diastolic = num(parts[1]);
    }
  }

  const urine = find('요단백');

  return {
    source: '국민건강보험공단',
    examDate: combineDate(rec.Year, rec.CheckUpDate),
    heightCm: val('신장'),
    weightKg: val('체중'),
    bmi: val('체질량지수', '비만도', 'BMI'),
    waistCm: val('허리둘레'),
    systolicBp: systolic,
    diastolicBp: diastolic,
    fastingGlucose: val('공복혈당', '식전혈당'),
    hba1c: val('당화혈색소'),
    totalCholesterol: val('총콜레스테롤'),
    hdl: val('HDL', '고밀도'),
    ldl: val('LDL', '저밀도'),
    triglyceride: val('중성지방', '트리글리'),
    hemoglobin: val('혈색소', '헤모글로빈'),
    ast: val('AST', 'SGOT'),
    alt: val('ALT', 'SGPT'),
    gtp: val('감마', 'GTP', 'γ'),
    creatinine: val('크레아티닌'),
    egfr: val('신사구체여과율', 'GFR', 'eGFR'),
    urineProtein: urine?.Value ?? '',
    smoking: '',
    drinking: '',
    debugItems: items.map((it) => ({ name: it.Name ?? '', unit: it.Unit ?? '' })),
  };
}

// 전 회차 파싱 → 최신순.
function parseCheckups(j: TilkoResp): CheckupData[] {
  const list = Array.isArray(j.ResultList) ? (j.ResultList as NhisRecord[]) : [];
  const out = list.map((rec) => parseRecord(rec));
  out.sort((a, b) => (a.examDate < b.examDate ? 1 : -1));
  if (out.length === 0) throw new Error('NHIS_FETCH_FAILED:검진 기록이 없습니다');
  return out;
}
