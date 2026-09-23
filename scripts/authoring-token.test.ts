// 맥 에이전트 토큰 검사 — 파일 자리 · 모양 · 저장 권한 · /me 응답 풀기
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 나풀기, 토큰모양인가, 토큰읽기, 토큰자리, 토큰저장 } from './authoring-token.js';

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

describe('나풀기 — /api/auth/me 로 이름·서비스·대상 서버를 받는다', () => {
  const 몸 = {
    user: {
      username: 'mac',
      role: 'operator',
      services: [{ prefix: 'DEMO', envs: [{ env: 'qa', baseUrl: 'https://qa.x' }] }, { prefix: 'TODO' }],
    },
  };

  it('이름과 서비스, 서비스마다 대상 서버를 낸다', () => {
    expect(나풀기(몸)).toEqual({
      username: 'mac',
      서비스들: ['DEMO', 'TODO'],
      서버표: { DEMO: [{ env: 'qa', baseUrl: 'https://qa.x' }], TODO: [] },
    });
  });

  it('보기만 등급이면 사유를 낸다 — 줄을 집을 수 없다', () => {
    expect(나풀기({ user: { ...몸.user, role: 'viewer' } })).toMatch(/보기만/);
  });

  it('모양이 아니면 사유를 낸다', () => {
    expect(나풀기({ error: 'x' })).toMatch(/모양/);
  });
});
