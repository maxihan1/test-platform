// 크롤러가 자식의 로그인 스크립트를 역할마다 돌리기 — CRAWL_ROLE · CRAWL_STATE 넘기기 · 실패 까닭 (도메인/작성 §3.6 「화면 기록과 크롤러」 · PRD-F9-30) · 화면이 부른 API 듣기 (PRD-F10-05)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { chromium } from '@playwright/test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type 들은API, API더하기, API듣기, API상한, 로그인돌리기, 새쪽 } from './authoring-crawl-session.js';

let 폴더 = '';
beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'crawl-login-'));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(폴더, { recursive: true, force: true });
});

const 스크립트 = (글: string): string => {
  const 파일 = join(폴더, 'login.mjs');
  writeFileSync(파일, `import { writeFileSync } from 'node:fs';\n${글}\n`);
  return 파일;
};

describe('로그인돌리기', () => {
  it('역할은 CRAWL_ROLE, 쓸 상태 파일은 CRAWL_STATE 로 넘기고 새로 써졌으면 null', () => {
    const 상태 = join(폴더, 'rev-state-1.json');
    expect(로그인돌리기(스크립트('writeFileSync(process.env.CRAWL_STATE, process.env.CRAWL_ROLE);'), 상태, '관리자')).toBeNull();
    expect(readFileSync(상태, 'utf8')).toBe('관리자');
  });

  it('스크립트가 실패하면 종료 코드와 끝 줄 — 계정 비밀번호는 가린다', () => {
    vi.stubEnv('TARGET_LOGIN_PASSWORD', 'member-pw-77');
    vi.stubEnv('PLATFORM_ACCOUNTS', JSON.stringify([{ role: '관리자', loginPassword: 'admin-pw-99' }]));
    const 까닭 = 로그인돌리기(스크립트("console.error('틀림 member-pw-77 admin-pw-99'); process.exit(4);"), join(폴더, 's.json'), '관리자');
    expect(까닭).toBe('로그인 스크립트가 실패했다(종료 코드 4) — 틀림 •••••• ••••••');
  });

  it('상태 파일을 새로 안 쓰면 실패다', () => {
    expect(로그인돌리기(스크립트('void writeFileSync;'), join(폴더, 's.json'), '일반 회원')).toBe(
      '상태 파일이 새로 써지지 않았다 — 로그인 스크립트가 CRAWL_STATE 파일에 쓰는지 본다',
    );
  });
});

describe('API더하기', () => {
  it('그 화면 몫에 합치고 같은 줄은 하나 · 화면 하나에 상한까지', () => {
    const 몫 = new Map<number, 들은API>();
    API더하기(몫, 0, new Map([['GET a', { method: 'GET', url: 'a' }]]));
    API더하기(몫, 0, new Map([['GET a', { method: 'GET', url: 'a' }], ['POST b', { method: 'POST', url: 'b' }]]));
    expect([...몫.get(0)!.keys()]).toEqual(['GET a', 'POST b']);
    API더하기(몫, 1, new Map(Array.from({ length: API상한 + 3 }, (_, i): [string, { method: string; url: string }] => [`GET ${i}`, { method: 'GET', url: String(i) }])));
    expect(몫.get(1)!.size).toBe(API상한);
  });
});

describe('API듣기', () => {
  it('화면이 부른 fetch · xhr 만 물음표 뒤를 빼고 듣는다 — 문서 · 그림은 안 듣는다', async () => {
    const 브라우저 = await chromium.launch();
    try {
      const { 맥락, 쪽 } = await 새쪽(브라우저, undefined);
      const 들은: 들은API = new Map();
      API듣기(쪽, 들은);
      await 맥락.route('https://s.test/**', (r) =>
        r.request().resourceType() === 'document'
          ? r.fulfill({ contentType: 'text/html', body: `<img src="/a.png"><script>fetch('/api/goods/3?token=t0k');const x=new XMLHttpRequest();x.open('POST','/api/cart');x.send()</script>` })
          : r.fulfill({ contentType: 'application/json', body: '{}' }),
      );
      await 쪽.goto('https://s.test/');
      await expect.poll(() => 들은.size).toBe(2);
      expect([...들은.values()]).toEqual([
        { method: 'GET', url: 'https://s.test/api/goods/3' },
        { method: 'POST', url: 'https://s.test/api/cart' },
      ]);
    } finally {
      await 브라우저.close();
    }
  });
});
