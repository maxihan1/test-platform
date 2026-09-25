// 맥 에이전트 토큰 검사 — 파일 자리 · 모양 · 저장 권한 · /me 응답 풀기
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 나풀기, 토큰고르기, 토큰모양인가, 토큰읽기, 토큰자리, 토큰저장 } from './authoring-token.js';

const 좋은토큰 = `tpa_${'A1b2_-'.repeat(7)}z`;
const 치울것: string[] = [];
afterEach(() => {
  for (const 자리 of 치울것.splice(0)) rmSync(자리, { recursive: true, force: true });
});
function 임시(): string {
  const 자리 = mkdtempSync(join(tmpdir(), 'authoring-token-test-'));
  치울것.push(자리);
  return 자리;
}

describe('토큰 자리와 모양', () => {
  it('홈 아래 한 곳이다 — 맥이든 윈도우든 같은 규칙', () => {
    expect(토큰자리('/Users/x')).toBe(join('/Users/x', '.test-platform', 'agent-token'));
  });

  it('서버가 주는 모양(tpa_ + 43글자)만 받는다', () => {
    expect(토큰모양인가(좋은토큰)).toBe(true);
    expect(토큰모양인가('비밀번호였던것')).toBe(false);
    expect(토큰모양인가(`${좋은토큰}x`)).toBe(false);
  });
});

describe('토큰 파일', () => {
  it('없으면 null — 그때 한 번 묻는다', () => {
    expect(토큰읽기(join(임시(), '없음'))).toBeNull();
  });

  it('붙여넣을 때 딸려 온 줄바꿈은 떼고 읽는다', () => {
    const 자리 = join(임시(), 'agent-token');
    writeFileSync(자리, `${좋은토큰}\n`);
    expect(토큰읽기(자리)).toBe(좋은토큰);
  });

  it('모양이 아니면 그 자리를 알려 주며 멈춘다 — 엉뚱한 값을 서버에 보내지 않는다', () => {
    const 자리 = join(임시(), 'agent-token');
    writeFileSync(자리, '엉뚱한값');
    expect(() => 토큰읽기(자리)).toThrow(자리);
  });

  it.skipIf(process.platform === 'win32')('저장하면 본인만 읽는다 — 이미 있던 파일도', () => {
    const 자리 = join(임시(), '.test-platform', 'agent-token');
    토큰저장(자리, 좋은토큰);
    expect(statSync(자리).mode & 0o777).toBe(0o600);
    expect(readFileSync(자리, 'utf8').trim()).toBe(좋은토큰);

    writeFileSync(자리, 'x', { mode: 0o644 });
    토큰저장(자리, 좋은토큰);
    expect(statSync(자리).mode & 0o777).toBe(0o600);
  });
});

describe('토큰고르기 — 서버는 환경값, 맥은 파일', () => {
  it('환경값이 있으면 그것을 쓰고 파일에 저장하지 않는다', () => {
    expect(토큰고르기({ AUTHORING_AGENT_TOKEN: 좋은토큰 }, null)).toEqual({ 토큰: 좋은토큰, 어디: '환경' });
  });

  it('환경값이 없으면 파일 값을 쓴다', () => {
    expect(토큰고르기({}, 좋은토큰)).toEqual({ 토큰: 좋은토큰, 어디: '파일' });
  });

  it('둘 다 없으면 null — 맥이면 그때 묻는다', () => {
    expect(토큰고르기({ AUTHORING_AGENT_TOKEN: '' }, null)).toBeNull();
  });

  it('환경값 모양이 틀리면 던진다 — .env 에 엉뚱한 값을 넣은 것이다', () => {
    expect(() => 토큰고르기({ AUTHORING_AGENT_TOKEN: 'sk-ant-oat01-x' }, null)).toThrow(/AUTHORING_AGENT_TOKEN/);
  });
});

describe('나풀기 — /api/auth/me 로 이름·서비스·대상 서버·테스트 폴더를 받는다', () => {
  const 몸 = {
    user: {
      username: 'mac',
      role: 'operator',
      services: [
        { prefix: 'DEMO', envs: [{ env: 'qa', baseUrl: 'https://qa.x' }], testsDir: 'demo' },
        { prefix: 'TODO', testsDir: 'todo-app' },
      ],
    },
  };

  it('이름과 서비스, 서비스마다 대상 서버와 테스트 폴더를 낸다', () => {
    expect(나풀기(몸)).toEqual({
      username: 'mac',
      서비스들: ['DEMO', 'TODO'],
      서버표: { DEMO: [{ env: 'qa', baseUrl: 'https://qa.x' }], TODO: [] },
      폴더표: { DEMO: { 폴더: 'demo' }, TODO: { 폴더: 'todo-app' } },
    });
  });

  it.each([
    ['옛 서버라 칸이 없다', undefined],
    ['비었다', ''],
    ['두 칸이다', 'a/b'],
    ['위로 올라간다', '..'],
    ['제자리다', '.'],
    ['허용 밖 글자가 있다', 'demo app'],
    ['글자가 아니다', 3],
  ])('테스트 폴더가 %s — 그 서비스만 폴더 대신 사유를 낸다', (_이름, 값) => {
    const 풀린것 = 나풀기({ user: { ...몸.user, services: [{ prefix: 'PAY', testsDir: 값 }, { prefix: 'DEMO', testsDir: 'demo' }] } });
    if (typeof 풀린것 === 'string') throw new Error(풀린것);
    expect(풀린것.폴더표.PAY).toEqual({ 사유: 'PAY 의 테스트 폴더 설정이 비었거나 한 칸 이름이 아니다 (설정 화면에서 고친다)' });
    expect(풀린것.폴더표.DEMO).toEqual({ 폴더: 'demo' });
  });

  it('보기만 등급이면 사유를 낸다 — 줄을 집을 수 없다', () => {
    expect(나풀기({ user: { ...몸.user, role: 'viewer' } })).toMatch(/보기만/);
  });

  it('모양이 아니면 사유를 낸다', () => {
    expect(나풀기({ error: 'x' })).toMatch(/모양/);
  });
});
