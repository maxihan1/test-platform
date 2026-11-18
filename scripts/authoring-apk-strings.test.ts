// APK 문자열 표 읽기 · 받아서 꺼내기 검사 (도메인/작성 §3.6 「종류별 기준」 화면 문구 · AUT-F4-09)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import JSZip from 'jszip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 문자열표읽기, 앱문구받기, 앱문구파일 } from './authoring-apk-strings.js';

function 길이칸(n: number, utf8: boolean): number[] {
  if (utf8) return n < 0x80 ? [n] : [0x80 | (n >> 8), n & 0xff];
  return n < 0x8000 ? [n & 0xff, n >> 8] : [((n >> 16) | 0x8000) & 0xff, ((n >> 16) | 0x8000) >> 8, n & 0xff, (n >> 8) & 0xff];
}

function 묶음(글들: string[], utf8: boolean): number[] {
  const 몸들 = 글들.map((글) => {
    if (utf8) {
      const 바이트 = [...new TextEncoder().encode(글)];
      return [...길이칸(글.length, true), ...길이칸(바이트.length, true), ...바이트, 0];
    }
    const 칸 = [...글].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8]);
    return [...길이칸(글.length, false), ...칸, 0, 0];
  });
  const 자리들: number[] = [];
  let 쌓임 = 0;
  for (const 몸 of 몸들) {
    자리들.push(쌓임);
    쌓임 += 몸.length;
  }
  const 글시작 = 28 + 글들.length * 4;
  const 크기 = 글시작 + 쌓임;
  const 머리 = new DataView(new ArrayBuffer(글시작));
  머리.setUint16(0, 0x0001, true);
  머리.setUint16(2, 28, true);
  머리.setUint32(4, 크기, true);
  머리.setUint32(8, 글들.length, true);
  머리.setUint32(16, utf8 ? 0x100 : 0, true);
  머리.setUint32(20, 글시작, true);
  자리들.forEach((v, i) => 머리.setUint32(28 + i * 4, v, true));
  return [...new Uint8Array(머리.buffer), ...몸들.flat()];
}

function 표(값: number[], 뒤: number[] = []): Uint8Array {
  const 머리 = new DataView(new ArrayBuffer(12));
  머리.setUint16(0, 0x0002, true);
  머리.setUint16(2, 12, true);
  머리.setUint32(4, 12 + 값.length + 뒤.length, true);
  머리.setUint32(8, 1, true);
  return new Uint8Array([...new Uint8Array(머리.buffer), ...값, ...뒤]);
}

describe('문자열표읽기', () => {
  it('UTF-8 값 문자열을 차례대로 겹침 없이 읽고 경로 · 빈 글은 뺀다', () => {
    const 긴글 = '가'.repeat(200);
    expect(문자열표읽기(표(묶음(['%d분 전', 'res/drawable/a.xml', '', '%d분 전', 'Mastodon 에 기여하기', 긴글], true)))).toEqual(['%d분 전', 'Mastodon 에 기여하기', 긴글]);
  });

  it('UTF-16 묶음도 읽고 줄바꿈은 두 글자로 적어 한 줄에 하나다', () => {
    expect(문자열표읽기(표(묶음(['첫 줄\n둘째 줄', 'Boost'], false)))).toEqual(['첫 줄\\n둘째 줄', 'Boost']);
  });

  it('첫 묶음만 읽는다 — 뒤 묶음은 키 이름이다', () => {
    expect(문자열표읽기(표(묶음(['저장'], true), 묶음(['app_name'], true)))).toEqual(['저장']);
  });

  it('문자열 표가 아니면 던진다', () => {
    expect(() => 문자열표읽기(new Uint8Array(16))).toThrow('머리가 아니다');
  });
});

describe('앱문구받기', () => {
  let 서버: Server;
  let 주소 = '';
  let 폴더 = '';
  const 바꾸기 = (변환: { 명령: string; 인자: string[] }, 자리: string) => {
    const 결과 = spawnSync(변환.명령, 변환.인자, { cwd: 자리, encoding: 'utf8' });
    return { ok: 결과.status === 0, 까닭: 결과.stderr };
  };

  beforeAll(async () => {
    const 앱 = new JSZip();
    앱.file('resources.arsc', 표(묶음(['%d분 전', '마스토돈에 기여'], true)));
    const 빈앱 = new JSZip();
    빈앱.file('classes.dex', 'x');
    const [apk, 빈apk] = await Promise.all([앱.generateAsync({ type: 'nodebuffer' }), 빈앱.generateAsync({ type: 'nodebuffer' })]);
    서버 = createServer((req, res) => {
      if (req.url === '/app.apk') return void res.end(apk);
      if (req.url === '/empty.apk') return void res.end(빈apk);
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((r) => 서버.listen(0, '127.0.0.1', r));
    const 자리 = 서버.address();
    주소 = typeof 자리 === 'object' && 자리 !== null ? `http://127.0.0.1:${String(자리.port)}` : '';
    폴더 = mkdtempSync(join(tmpdir(), 'apk-strings-'));
  });

  afterAll(() => {
    서버.close();
    rmSync(폴더, { recursive: true, force: true });
  });

  it('링크로 받아 문구 파일을 두고 받은 APK 는 지운다', async () => {
    const 알림: string[] = [];
    expect(await 앱문구받기(`${주소}/app.apk`, 폴더, 바꾸기, (글) => 알림.push(글))).toBe(앱문구파일(폴더));
    expect(readFileSync(앱문구파일(폴더), 'utf8')).toBe('%d분 전\n마스토돈에 기여\n');
    expect(existsSync(join(폴더, 'app.apk'))).toBe(false);
    expect(알림).toEqual([]);
  }, 30_000);

  it('스토어 앱 패키지 이름이면 받지 않고 앞 실행의 문구 파일도 지운다', async () => {
    writeFileSync(앱문구파일(폴더), '옛 문구\n');
    expect(await 앱문구받기('org.joinmastodon.android', 폴더, 바꾸기, () => undefined)).toBeUndefined();
    expect(existsSync(앱문구파일(폴더))).toBe(false);
  });

  it('앞 자식이 같은 이름으로 폴더를 심어 둬도 지우고 받는다 — 던지지 않는다', async () => {
    mkdirSync(앱문구파일(폴더));
    mkdirSync(join(폴더, 'app.apk'));
    expect(await 앱문구받기(`${주소}/app.apk`, 폴더, 바꾸기, () => undefined)).toBe(앱문구파일(폴더));
    expect(readFileSync(앱문구파일(폴더), 'utf8')).toBe('%d분 전\n마스토돈에 기여\n');
  }, 30_000);

  it('받기 · 꺼내기에 실패하면 알리고 파일 없이 간다', async () => {
    const 알림: string[] = [];
    expect(await 앱문구받기(`${주소}/none.apk`, 폴더, 바꾸기, (글) => 알림.push(글))).toBeUndefined();
    expect(await 앱문구받기(`${주소}/empty.apk`, 폴더, 바꾸기, (글) => 알림.push(글))).toBeUndefined();
    expect(알림[0]).toContain('APK 받기 404');
    expect(알림[1]).toMatch(/^앱 문구를 못 꺼냈다\(Error: APK 안에 resources\.arsc 가 없다\)/);
    expect(existsSync(앱문구파일(폴더))).toBe(false);
  }, 30_000);
});
