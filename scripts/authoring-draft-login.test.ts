// PRD 초안 미리 로그인 — 로컬 로그인 화면에 들어가 상태 파일을 쓰고, 틀린 계정 · 로그인 칸 없는 화면은 까닭만 낸다
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { type Server, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 미리로그인, 미리로그인재료 } from './authoring-draft-login.js';

const 폼 = '<form method="post" action="/login"><input name="id"><input type="password" name="pw"><button>로그인</button></form>';

describe('미리로그인', () => {
  let 서버: Server;
  let 기준 = '';
  let 폴더 = '';

  beforeAll(async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'draft-login-'));
    서버 = createServer((요청, 답) => {
      if (요청.method === 'POST' && 요청.url === '/login') {
        let 몸 = '';
        요청.on('data', (c: Buffer) => (몸 += c.toString()));
        요청.on('end', () => {
          const 값 = new URLSearchParams(몸);
          if (값.get('id') === 'qa1' && 값.get('pw') === 'p"w-비밀') {
            답.writeHead(302, { 'set-cookie': 'sid=ok1; Path=/', location: '/home' }).end();
          } else 답.writeHead(200, { 'content-type': 'text/html' }).end(폼);
        });
        return;
      }
      const 글 = 요청.url === '/login' ? 폼 : '<p>홈</p>';
      답.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(글);
    });
    await new Promise<void>((r) => 서버.listen(0, '127.0.0.1', r));
    const 주소 = 서버.address();
    기준 = `http://127.0.0.1:${typeof 주소 === 'object' && 주소 !== null ? 주소.port : 0}`;
  });

  afterAll(() => {
    서버.close();
    rmSync(폴더, { recursive: true, force: true });
  });

  it('비밀번호 칸과 그 앞 칸에 계정을 넣고 Enter 로 들어가 쿠키가 든 상태 파일을 0600 으로 쓴다', async () => {
    const 상태파일 = join(폴더, 'ok.json');
    expect(await 미리로그인({ 기준주소: 기준, 로그인주소: '/login', 아이디: 'qa1', 비밀번호: 'p"w-비밀', 상태파일 })).toBeNull();
    const 상태 = JSON.parse(readFileSync(상태파일, 'utf8')) as { cookies: { name: string; value: string }[] };
    expect(상태.cookies).toContainEqual(expect.objectContaining({ name: 'sid', value: 'ok1' }));
    expect(statSync(상태파일).mode & 0o777).toBe(0o600);
  });

  it('틀린 계정이면 로그인 화면에 머물러 상태 파일을 안 쓴다', async () => {
    const 상태파일 = join(폴더, 'bad.json');
    expect(await 미리로그인({ 기준주소: 기준, 로그인주소: '/login', 아이디: 'qa1', 비밀번호: 'nope', 상태파일 })).toContain('로그인 화면에 머물렀다');
    expect(existsSync(상태파일)).toBe(false);
  });

  it('로그인 칸이 없는 화면이면 까닭을 내고 그 안에 비밀번호는 없다', async () => {
    const 상태파일 = join(폴더, 'none.json');
    const 까닭 = await 미리로그인({ 기준주소: 기준, 로그인주소: '/home', 아이디: 'qa1', 비밀번호: 'p"w-비밀', 상태파일 });
    expect(까닭).toContain('로그인하지 못했다');
    expect(까닭).not.toContain('p"w-비밀');
    expect(existsSync(상태파일)).toBe(false);
  }, 30_000);
});

describe('미리로그인재료', () => {
  const t = { env: 'qa', baseUrl: 'https://qa.example', loginId: 'qa1', loginPassword: 's3cret!' };
  it('주소 · 로그인 화면 · 계정이 다 있으면 자식 임시 폴더의 상태 파일로 로그인한다', () => {
    expect(미리로그인재료(t, '/login', '/w/tmp')).toEqual({ 기준주소: 'https://qa.example', 로그인주소: '/login', 아이디: 'qa1', 비밀번호: 's3cret!', 상태파일: '/w/tmp/login-state.json' });
  });
  it('하나라도 없으면 로그인하지 않는다 — 옛 서버(loginUrl 없음) · 로그인 화면 기록 없음 · 운영 서버(계정 비움)', () => {
    expect(미리로그인재료(t, undefined, '/w/tmp')).toBeNull();
    expect(미리로그인재료(t, null, '/w/tmp')).toBeNull();
    expect(미리로그인재료({ ...t, loginPassword: '' }, '/login', '/w/tmp')).toBeNull();
    expect(미리로그인재료({ ...t, baseUrl: null }, '/login', '/w/tmp')).toBeNull();
    expect(미리로그인재료(undefined, '/login', '/w/tmp')).toBeNull();
  });
});
