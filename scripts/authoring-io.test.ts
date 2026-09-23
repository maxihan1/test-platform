// 작성 에이전트 공용 손 검사 — 판정 스크립트 고정 · 닫기 · 시간 초과
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { type 보고손, 다시하며, 닫으며, 친다, 판정기만들기 } from './authoring-io.js';

const 치울것: string[] = [];
afterEach(() => {
  for (const 자리 of 치울것.splice(0)) rmSync(자리, { recursive: true, force: true });
});

function 임시폴더(): string {
  const 자리 = mkdtempSync(join(tmpdir(), 'authoring-io-test-'));
  치울것.push(자리);
  return 자리;
}

// 받은 목록이 'tests/a.spec.ts' 하나이고 기준이 'BASE' 일 때만 통과하는 가짜 판정
const 가짜판정 = [
  "import { readFileSync } from 'node:fs';",
  "const 목록 = readFileSync(0, 'utf8');",
  "process.exit(목록 === 'tests/a.spec.ts\\n' && process.argv[2] === 'BASE' ? 0 : 1);",
].join('\n');

describe('판정기 — 켤 때 판정 스크립트를 메모리에 고정한다', () => {
  it('목록은 표준입력, 기준은 인자로 넘긴다', () => {
    const 자리 = 임시폴더();
    const 스크립트 = join(자리, 'cases-only.mjs');
    writeFileSync(스크립트, 가짜판정);
    const 판정 = 판정기만들기(스크립트);
    expect(판정(['tests/a.spec.ts'], 'BASE', 자리)).toBe(true);
    expect(판정(['apps/x.ts'], 'BASE', 자리)).toBe(false);
    expect(판정(['tests/a.spec.ts'], 'origin/main', 자리)).toBe(false);
  });

  it('켠 뒤 파일이 「늘 통과」로 바뀌어도 판정은 켤 때 내용 그대로다', () => {
    const 자리 = 임시폴더();
    const 스크립트 = join(자리, 'cases-only.mjs');
    writeFileSync(스크립트, 가짜판정);
    const 판정 = 판정기만들기(스크립트);
    writeFileSync(스크립트, 'process.exit(0);');
    expect(판정(['apps/x.ts'], 'BASE', 자리)).toBe(false);
  });

  // 맥의 tmpdir 은 /var → /private/var 심링크다. 진짜 스크립트의 「직접 불렸나」 비교가 어긋나면
  // 판정 본체가 안 돌고 종료 0 이라 **무엇이든 통과한다** (2026-09-23 실측)
  it('진짜 cases-only.mjs 로도 코드 파일은 통과하지 못한다', () => {
    const 판정 = 판정기만들기('.claude/scripts/cases-only.mjs');
    expect(판정(['apps/admin/x.ts'], 'HEAD', process.cwd())).toBe(false);
    expect(판정(['docs/cases/DEMO.md'], 'HEAD', process.cwd())).toBe(true);
  });
});

function 가짜손(): { 손: 보고손; 끝낸것: Record<string, unknown>[] } {
  const 끝낸것: Record<string, unknown>[] = [];
  return {
    끝낸것,
    손: {
      단계: async () => undefined,
      끝내기: async (몸) => {
        끝낸것.push(몸);
      },
    },
  };
}

describe('닫으며 — 한 건을 감싸 예외를 실패로 닫는다', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('끝내기 전에 예외가 튀면 실패로 닫는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { 손, 끝낸것 } = 가짜손();
    await 닫으며(손, async () => {
      throw new Error('터짐');
    });
    expect(끝낸것).toEqual([{ status: 'FAILED', error: '예상 못 한 오류: 터짐' }]);
  });

  it('이미 끝낸 뒤의 예외는 FAILED 로 덮어쓰지 않고 로그만 남긴다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { 손, 끝낸것 } = 가짜손();
    await 닫으며(손, async (감싼손) => {
      await 감싼손.끝내기({ status: 'DONE', prUrl: 'https://github.com/x/y/pull/1' });
      throw new Error('보고 뒤 터짐');
    });
    expect(끝낸것).toEqual([{ status: 'DONE', prUrl: 'https://github.com/x/y/pull/1' }]);
  });

  it('잡은 예외를 stack 과 함께 터미널에 찍는다 — 삼키지 않는다', async () => {
    const 찍힘 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 오류 = new Error('터짐');
    await 닫으며(가짜손().손, async () => {
      throw 오류;
    });
    expect(찍힘.mock.calls.flat().join('\n')).toContain(오류.stack);
  });

  it('거절은 닫은 뒤에도 다시 던진다 — 줄 돌기가 멈춰야 한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      닫으며(가짜손().손, async () => {
        throw new Error('서버가 거절했다 (401)');
      }),
    ).rejects.toThrow('서버가 거절했다');
  });
});

describe('다시하며 — 다시 해도 같은 실패는 다시 하지 않는다', () => {
  it('그만이 붙은 실패는 한 번에 끝낸다', async () => {
    let 횟수 = 0;
    const 결과 = await 다시하며('push', () => {
      횟수 += 1;
      return { 까닭: '[차단] 새 폴더', 그만: true };
    });
    expect(결과).toEqual({ 까닭: '[차단] 새 폴더', 그만: true });
    expect(횟수).toBe(1);
  });
});

describe('친다 — 시간 초과는 그 사실을 까닭에 싣는다', () => {
  it('제한을 넘기면 실패이고 까닭에 시간 초과가 있다', () => {
    const r = 친다('sleep', ['5'], process.cwd(), undefined, 200);
    expect(r.ok).toBe(false);
    expect(r.시간초과).toBe(true);
    expect(r.까닭).toMatch(/시간 초과/);
  });
});
