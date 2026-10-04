// 맥 에이전트 토큰 검사 — 파일 자리 · 모양 · 저장 권한 · /me 응답 풀기
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 건설정, 나풀기, 토큰고르기, 토큰모양인가, 토큰읽기, 토큰자리, 토큰저장 } from './authoring-token.js';

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
      role: 'member',
      services: [
        { prefix: 'DEMO', envs: [{ env: 'qa', baseUrl: 'https://qa.x' }], testsDir: 'demo', permissions: { cases: 'read', runs: 'read', authoring: 'write' } },
        { prefix: 'TODO', testsDir: 'todo-app', permissions: { cases: 'read', runs: 'read', authoring: 'read' } },
      ],
    },
  };

  it('이름과 서비스, 서비스마다 대상 서버와 테스트 폴더를 낸다 — 작성 읽기만인 서비스는 뺀다 (집으면 403 으로 에이전트가 선다)', () => {
    expect(나풀기(몸)).toEqual({
      username: 'mac',
      서비스들: ['DEMO'],
      설정표: { DEMO: { 서버들: [{ env: 'qa', baseUrl: 'https://qa.x' }], 폴더: { 폴더: 'demo' }, 제외: [] } },
    });
  });

  it('훑지 않을 경로는 설정과 같은 규칙으로 다시 거른다 — 끝의 / · 앞뒤 공백 · 중복을 걷는다 (#153)', () => {
    const 풀린것 = 나풀기({ user: { ...몸.user, services: [{ ...몸.user.services[0], crawlExclude: ['/daejeon', ' /gyeongnam/ ', '/daejeon'] }] } });
    if (typeof 풀린것 === 'string') throw new Error(풀린것);
    expect(풀린것.설정표.DEMO?.제외).toEqual(['/daejeon', '/gyeongnam']);
  });

  it.each([
    ['옛 서버라 칸이 없다', undefined],
    ['배열이 아니다', '/daejeon'],
    ['글자가 아닌 줄이 있다', ['/daejeon', 3]],
    ['/ 로 시작하지 않는다', ['daejeon']],
    ['셸 글자가 섞였다', ["/a';rm -rf ~;'"]],
  ])('훑지 않을 경로가 %s — 빈 목록으로 두고 작성은 계속 간다 (#153)', (_이름, 값) => {
    const 풀린것 = 나풀기({ user: { ...몸.user, services: [{ ...몸.user.services[0], crawlExclude: 값 }] } });
    if (typeof 풀린것 === 'string') throw new Error(풀린것);
    expect(풀린것.설정표.DEMO?.제외).toEqual([]);
    expect(풀린것.설정표.DEMO?.폴더).toEqual({ 폴더: 'demo' });
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
    const 풀린것 = 나풀기({ user: { ...몸.user, services: [{ prefix: 'PAY', testsDir: 값, permissions: { authoring: 'write' } }, 몸.user.services[0]] } });
    if (typeof 풀린것 === 'string') throw new Error(풀린것);
    expect(풀린것.설정표.PAY?.폴더).toEqual({ 사유: 'PAY 의 테스트 폴더 설정이 비었거나 한 칸 이름이 아니다 (설정 화면에서 고친다)' });
    expect(풀린것.설정표.DEMO?.폴더).toEqual({ 폴더: 'demo' });
  });

  const 읽기만 = { cases: 'write', runs: 'write', authoring: 'read' };

  it('작성 쓰기 권한이 있는 서비스가 하나도 없으면 사유를 낸다 — 줄을 집을 수 없다', () => {
    const 사유 = 나풀기({ user: { ...몸.user, services: [{ prefix: 'DEMO', testsDir: 'demo', permissions: 읽기만 }, { prefix: 'TODO', testsDir: 'todo' }] } });
    expect(사유).toMatch(/작성 쓰기 권한/);
    expect(사유).toMatch(/설정 > 계정/);
  });

  it('서비스가 하나도 없어도 사유를 낸다', () => {
    expect(나풀기({ user: { ...몸.user, services: [] } })).toMatch(/작성 쓰기 권한/);
  });

  it('작성 쓰기 권한이 한 서비스에만 있어도 줄을 집는다', () => {
    expect(typeof 나풀기(몸)).toBe('object');
  });

  it('운영(admin)이면 권한 칸과 상관없이 줄을 집는다', () => {
    const 풀린것 = 나풀기({ user: { ...몸.user, role: 'admin', services: [{ prefix: 'DEMO', testsDir: 'demo', permissions: 읽기만 }] } });
    if (typeof 풀린것 === 'string') throw new Error(풀린것);
    expect(풀린것.서비스들).toEqual(['DEMO']);
  });

  it('모양이 아니면 사유를 낸다', () => {
    expect(나풀기({ error: 'x' })).toMatch(/모양/);
  });
});

describe('건설정 — 건을 가져갈 때 다시 읽은 me 로 훑지 않을 경로만 바꾼다 (BLOCKER 2 · 도메인/인증 §7)', () => {
  const 켤때 = { 서버들: [{ env: 'qa', baseUrl: 'https://qa.x' }], 폴더: { 폴더: 'demo' }, 제외: ['/old'] };
  const 새me = (서비스: unknown[]) => ({ user: { username: 'mac', role: 'member', services: 서비스 } });

  it('설정을 바꿨으면 다음 건부터 새 경로를 쓴다 — 대상 서버 · 테스트 폴더는 켤 때 것 그대로', () => {
    const 몸 = 새me([{ prefix: 'DEMO', envs: [], testsDir: 'other', crawlExclude: ['/daejeon'], permissions: { authoring: 'write' } }]);
    expect(건설정(몸, 'DEMO', 켤때)).toEqual({ ...켤때, 제외: ['/daejeon'] });
  });

  it('비웠으면 빈 목록이다', () => {
    const 몸 = 새me([{ prefix: 'DEMO', testsDir: 'demo', crawlExclude: [], permissions: { authoring: 'write' } }]);
    expect(건설정(몸, 'DEMO', 켤때).제외).toEqual([]);
  });

  it.each([
    ['못 읽었다', null],
    ['모양이 아니다', { error: 'x' }],
    ['그 서비스가 빠졌다', 새me([{ prefix: 'PAY', testsDir: 'pay', crawlExclude: ['/x'], permissions: { authoring: 'write' } }])],
  ])('me 를 %s — 켤 때 읽은 것을 쓴다', (_이름, 몸) => {
    expect(건설정(몸, 'DEMO', 켤때)).toBe(켤때);
  });
});
