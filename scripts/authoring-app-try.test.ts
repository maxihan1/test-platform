// 앱 해 본 기록 — 해 보는 줄 가르기 · 기록 파일 · 실패에서 멈춤 · 비밀번호 가림 · 부를 수 없음
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type 돌리개, 시각글, 실행, 해보는줄인가 } from './authoring-app-try.js';

let 자료 = '';
let 명령파일 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-try-'));
  명령파일 = join(자료, '명령.txt');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(자료, { recursive: true, force: true });
});

const 손 = (코드들: Record<string, number> = {}): 돌리개 & { 돈: string[] } => {
  const 돈: string[] = [];
  let 화면 = 0;
  return { 돈, 돌린다: (줄) => (돈.push(줄), { 코드: 코드들[줄] ?? 0, 출력: `Ran: ${줄}` }), 화면: () => `app:.A/${String(화면++)}`, 지금: () => Date.UTC(2026, 10, 26, 1, 2, 3, 4) };
};
const 기록 = () => {
  const 파일들 = readdirSync(join(자료, 'app-try'));
  return { 이름: 파일들[0]!, 몸: JSON.parse(readFileSync(join(자료, 'app-try', 파일들[0]!), 'utf8')) as Record<string, unknown> };
};

describe('해 보는 줄', () => {
  it('누르기 · 적기 · 밀기 · 딥링크 · 도우미는 해 본 것, 화면 읽기는 본 것이다', () => {
    expect(해보는줄인가('npx appium-cli -s=probe tap e5')).toBe(true);
    expect(해보는줄인가('npx appium-cli -s=probe fill e5 "가"')).toBe(true);
    expect(해보는줄인가('npx appium-cli deeplink shop://x')).toBe(true);
    expect(해보는줄인가('npx tsx tests/demo/helpers/seed.ts')).toBe(true);
    expect(해보는줄인가('npx appium-cli -s=probe snapshot')).toBe(false);
    expect(해보는줄인가('npx appium-cli -s=probe find --regex 로그인')).toBe(false);
    expect(해보는줄인가('cat /etc/hosts')).toBe(false);
    expect(해보는줄인가('npx appium-cli -s probe tap e1')).toBe(true);
    expect(해보는줄인가('cd x && npx tsx ./tests/demo/helpers/seed.ts')).toBe(true);
  });

  it('17자리 시각', () => {
    expect(시각글(Date.UTC(2026, 10, 26, 1, 2, 3, 4))).toBe('20261126010203004');
  });
});

describe('실행', () => {
  it('명령마다 코드 · 출력과 앞뒤 화면을 <시각>-<이름>.json 에 남긴다', () => {
    writeFileSync(명령파일, '# 글쓰기\nnpx appium-cli -s=probe tap e1\n\nnpx appium-cli -s=probe screenshot\n');
    const h = 손();
    expect(실행([자료, '글쓰기-한도', 명령파일], h, {})).toBe(0);
    const { 이름, 몸 } = 기록();
    expect(이름).toBe('20261126010203004-글쓰기-한도.json');
    expect(몸).toMatchObject({ 이름: '글쓰기-한도', 앞화면: 'app:.A/0', 뒤화면: 'app:.A/1', 해봄: true });
    expect(몸.명령).toEqual([{ 줄: 'npx appium-cli -s=probe tap e1', 코드: 0, 출력: 'Ran: npx appium-cli -s=probe tap e1' }, { 줄: 'npx appium-cli -s=probe screenshot', 코드: 0, 출력: 'Ran: npx appium-cli -s=probe screenshot' }]);
  });

  it('실패한 줄에서 멈추고 1 — 멈춰 안 돈 누르기는 해 본 것으로 안 센다', () => {
    writeFileSync(명령파일, 'npx appium-cli -s=probe snapshot\nnpx appium-cli -s=probe tap e9\n');
    const h = 손({ 'npx appium-cli -s=probe snapshot': 1 });
    expect(실행([자료, '본것', 명령파일], h, {})).toBe(1);
    expect(h.돈).toHaveLength(1);
    expect(기록().몸).toMatchObject({ 멈춤: 1, 해봄: false });
  });

  it('출력의 테스트 계정 비밀번호를 가린다', () => {
    writeFileSync(명령파일, 'npx appium-cli -s=probe fill e5 pw-1234\n');
    실행([자료, '로그인', 명령파일], 손(), { PLATFORM_ACCOUNTS: JSON.stringify([{ loginPassword: 'pw' }, { loginPassword: 'pw-1234' }]) });
    expect(JSON.stringify(기록().몸)).not.toContain('1234');
  });

  it('이름 · 명령 파일이 틀리면 2', () => {
    writeFileSync(명령파일, '');
    expect(실행([자료, '../밖', 명령파일], 손(), {})).toBe(2);
    expect(실행([자료, '빈것', 명령파일], 손(), {})).toBe(2);
    expect(실행([자료, '없음', join(자료, '없는파일')], 손(), {})).toBe(2);
    expect(실행([자료], 손(), {})).toBe(2);
  });
});
