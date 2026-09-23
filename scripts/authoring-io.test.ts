// 작성 에이전트 공용 손 검사 — 판정 스크립트 고정 · 닫기 · 시간 초과 · 끊긴 연결
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { type 보고손, 다시하며, 닫으며, 부른다, 친다, 판정기만들기, 한번더건다 } from './authoring-io.js';

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


// fetch 는 응답을 하나도 못 받은 연결 오류를 이 모양으로 던진다 (#3336 의 `fetch failed`)
const 끊김 = () => new TypeError('fetch failed');
const 답 = (status: number) => new Response(status === 204 ? null : '{}', { status });

describe('부른다 — 서버에 못 닿은 요청은 한 번 더 건다 (#3336)', () => {
  // 실제 끊김을 재현하려 했으나 막힌 루프 80초·220초로도 안 났다 — 흉내로 검사한다 (2026-09-23 사용자 결정)
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function 가짜(...차례: (() => Response | Error)[]) {
    const 받은것: RequestInit[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_주소: string, 옵션: RequestInit) => {
        받은것.push(옵션);
        const 다음 = 차례.shift();
        if (다음 === undefined) throw new Error('가짜 fetch 가 예상보다 많이 불렸다');
        const 값 = 다음();
        if (값 instanceof Error) throw 값;
        return 값;
      }),
    );
    return 받은것;
  }

  it('첫 번이 연결 오류면 새 시간 제한으로 한 번 더 걸어 성공한다', async () => {
    const 받은것 = 가짜(끊김, () => 답(200));
    const r = await 부른다('http://x', 'c', '/stage', { method: 'PATCH', body: { stage: '올리는 중' } });
    expect(r.status).toBe(200);
    expect(받은것).toHaveLength(2);
    expect(받은것[1]?.body).toBe(JSON.stringify({ stage: '올리는 중' }));
    // 시도마다 30초를 새로 받는다 — 나눠 쓰면 두 번째가 남은 시간만 받는다
    expect(받은것[1]?.signal).not.toBe(받은것[0]?.signal);
  });

  it('연결 오류가 두 번 이어지면 더 걸지 않고 던진다', async () => {
    const 받은것 = 가짜(끊김, 끊김);
    await expect(부른다('http://x', 'c', '/stage')).rejects.toThrow('fetch failed');
    expect(받은것).toHaveLength(2);
  });

  it('거절(403)은 다시 걸지 않는다', async () => {
    const 받은것 = 가짜(() => 답(403));
    await expect(부른다('http://x', 'c', '/stage')).rejects.toThrow('서버가 거절했다');
    expect(받은것).toHaveLength(1);
  });

  it('응답을 받은 오류(500)는 다시 걸지 않고 그대로 돌려준다', async () => {
    const 받은것 = 가짜(() => 답(500));
    expect((await 부른다('http://x', 'c', '/stage')).status).toBe(500);
    expect(받은것).toHaveLength(1);
  });

  it('시간 초과는 다시 걸지 않는다 — 서버가 멈춘 것이라 30초를 한 번 더 쓸 뿐이다', async () => {
    const 받은것 = 가짜(() => new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    await expect(부른다('http://x', 'c', '/stage')).rejects.toThrow('timeout');
    expect(받은것).toHaveLength(1);
  });

  it('연결 오류가 아닌 TypeError(잘못된 주소 등)는 다시 걸지 않는다', async () => {
    const 받은것 = 가짜(() => new TypeError('Failed to parse URL from x/api/stage'));
    await expect(부른다('x', 'c', '/stage')).rejects.toThrow('Failed to parse URL');
    expect(받은것).toHaveLength(1);
  });
});

describe('한번더건다 — 자료 받기도 같은 손을 쓴다', () => {
  it('첫 번이 연결 오류면 한 번 더 불러 그 답을 돌려준다', async () => {
    let 불린수 = 0;
    const r = await 한번더건다(async () => {
      불린수 += 1;
      if (불린수 === 1) throw 끊김();
      return 답(200);
    });
    expect(r.status).toBe(200);
    expect(불린수).toBe(2);
  });

  it('연결 오류가 아니면 한 번만 부르고 그대로 던진다', async () => {
    let 불린수 = 0;
    await expect(
      한번더건다(async () => {
        불린수 += 1;
        throw new Error('다른 것');
      }),
    ).rejects.toThrow('다른 것');
    expect(불린수).toBe(1);
  });
});
