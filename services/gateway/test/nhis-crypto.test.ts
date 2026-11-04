import { describe, it, expect, beforeAll } from 'vitest';
import * as nodeCrypto from 'node:crypto';
import { webcrypto } from 'node:crypto';
import {
  rsaPkcs1v15EncryptB64,
  aesEncryptB64,
  aesDecrypt,
  randomAesKey,
} from '../src/routes/nhis/tilko-crypto.js';

// 틸코 크립토가 PHP 샘플(openssl AES-128-CBC/PKCS7 + RSA/PKCS1-v1.5)과 정확히 호환되는지 검증.
beforeAll(() => {
  if (!(globalThis as { crypto?: unknown }).crypto) {
    (globalThis as { crypto?: unknown }).crypto = webcrypto;
  }
});

describe('tilko-crypto', () => {
  it('AES-128-CBC(zero IV, PKCS7) round-trips with node openssl', async () => {
    const key = randomAesKey();
    const plain = '홍길동-ABC-19880101'; // UTF-8/Korean
    const encB64 = await aesEncryptB64(key, plain);

    const decipher = nodeCrypto.createDecipheriv('aes-128-cbc', Buffer.from(key), Buffer.alloc(16, 0));
    const dec = Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]);
    expect(dec.toString('utf8')).toBe(plain);

    // 내 복호화도 일치
    expect(await aesDecrypt(key, encB64)).toBe(plain);
  });

  it('RSA PKCS1 v1.5 encrypt → node privateDecrypt recovers the AES key', async () => {
    const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const spkiB64 = Buffer.from(publicKey.export({ type: 'spki', format: 'der' })).toString('base64');
    const aesKey = randomAesKey();

    const encB64 = await rsaPkcs1v15EncryptB64(spkiB64, aesKey);
    const recovered = nodeCrypto.privateDecrypt(
      { key: privateKey, padding: nodeCrypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(encB64, 'base64'),
    );
    expect(Buffer.from(recovered).equals(Buffer.from(aesKey))).toBe(true);
  });
});
