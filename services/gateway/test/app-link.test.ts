import { describe, expect, it } from 'vitest';
import { cleanSource, detectOs } from '../src/routes/app-link/index.js';

describe('app-link — 앱 받기 링크 기기 판정', () => {
  it('안드로이드·아이폰·그 밖', () => {
    expect(detectOs('Mozilla/5.0 (Linux; Android 14; SM-S918N) Chrome/130')).toBe('android');
    expect(detectOs('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari')).toBe('ios');
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe('other');
  });

  it('미리보기 로봇은 세지 않게 bot', () => {
    expect(detectOs('facebookexternalhit/1.1')).toBe('bot');
    expect(detectOs('Mozilla/5.0 (compatible; kakaotalk-scrap/1.0)')).toBe('bot');
    expect(detectOs('WhatsApp/2.23.20 A')).toBe('bot');
  });

  it('to= 로 강제', () => {
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0)', 'ios')).toBe('ios');
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0)', 'mac')).toBe('other');
  });

  it('from 은 영문·숫자·_- 만 30자까지', () => {
    expect(cleanSource('vita_code')).toBe('vita_code');
    expect(cleanSource("x'; DROP TABLE--")).toBe('xDROPTABLE--');
    expect(cleanSource('')).toBeNull();
    expect(cleanSource(undefined)).toBeNull();
    expect(cleanSource('a'.repeat(50))).toHaveLength(30);
  });
});
