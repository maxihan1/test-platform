// 작성 에이전트 공용 손 검사 — 판정 스크립트 고정 · 닫기 · 시간 초과 · 끊긴 연결
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type 보고손,
  거절된보고대신,
  다시하며,
  보고손만들기,
  닫으며,
  부른다,
  친다,
  판정기만들기,
  한번더건다,
} from './authoring-io.js';

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

  it('끝내기 — 셈을 뺀 몸이 또 400 이면 FAILED 로 한 번 더 보낸다 — RUNNING 에 남지 않게', async () => {
    const 받은것 = 가짜(
      () => new Response(JSON.stringify({ error: 'BAD_COVERAGE' }), { status: 400 }),
      () => new Response(JSON.stringify({ error: 'BAD_PR_URL' }), { status: 400 }),
      () => 답(200),
    );
    const 몸 = { status: 'DONE', prUrl: 'https://x/pull/1', result: { coverage: { total: 1 } } };
    expect(((await 보고손만들기('http://x', 'c', 'MKT', 5).끝내기(몸)) as { status: number }).status).toBe(200);
    const 보낸몸 = 받은것.map((o) => JSON.parse(String(o.body)) as Record<string, unknown>);
    expect(보낸몸[1]).toEqual({ status: 'DONE', prUrl: 'https://x/pull/1' });
    expect(보낸몸[2]).toMatchObject({ status: 'FAILED' });
  });

  it('끝내기 — 셈을 뺀 몸이 5xx 를 받으면 다음 시도도 셈을 뺀 몸으로 다시 보낸다 — PR 주소 · 보류를 잃지 않게', async () => {
    vi.useFakeTimers();
    try {
      const 받은것 = 가짜(
        () => new Response(JSON.stringify({ error: 'BAD_COVERAGE' }), { status: 400 }),
        () => 답(503),
        () => 답(200),
      );
      const 몸 = { status: 'DONE', prUrl: 'https://x/pull/1', result: { coverage: { total: 1 } } };
      const 끝 = 보고손만들기('http://x', 'c', 'MKT', 5).끝내기(몸);
      await vi.runAllTimersAsync();
      expect(((await 끝) as { status: number }).status).toBe(200);
      const 보낸몸 = 받은것.map((o) => JSON.parse(String(o.body)) as Record<string, unknown>);
      expect(보낸몸).toHaveLength(3);
      expect(보낸몸[2]).toEqual({ status: 'DONE', prUrl: 'https://x/pull/1' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('토큰을 Bearer 로 싣고 쿠키는 안 싣는다 — 맥은 비밀번호 로그인을 안 한다', async () => {
    const 받은것 = 가짜(() => 답(200));
    await 부른다('http://x', 'tpa_열쇠', '/stage');
    expect(받은것[0]?.headers).toEqual({ authorization: 'Bearer tpa_열쇠' });
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

describe('거절된보고대신 — 끝났다는 보고가 400 이면 실패로 한 번 더 보내 RUNNING 에 남지 않게 한다 (2026-09-29 5877)', () => {
  it('400 이면 거절 까닭과 PR 주소를 실어 FAILED 로 바꿔 보낸다', () => {
    const 대신 = 거절된보고대신(400, { error: 'BAD_PR_URL' }, { status: 'DONE', prUrl: 'https://github.com/a/b/pull/105' });
    expect(대신).toMatchObject({ status: 'FAILED' });
    expect(String(대신?.error)).toContain('BAD_PR_URL');
    expect(String(대신?.error)).toContain('https://github.com/a/b/pull/105');
    expect(대신).not.toHaveProperty('prUrl');
  });
  it('셈이 거절되면(BAD_COVERAGE) 셈만 뺀 같은 몸을 보낸다 — FAILED 로 바꾸면 PR · 보류 · 이어하기를 잃는다', () => {
    const 몸 = { status: 'DONE', prUrl: 'https://github.com/a/b/pull/7', result: { held: [], coverage: { total: 1 } } };
    expect(거절된보고대신(400, { error: 'BAD_COVERAGE' }, 몸)).toEqual({ status: 'DONE', prUrl: 'https://github.com/a/b/pull/7', result: { held: [] } });
    const 거절 = { status: 'STOPPED', stopReason: 'REJECTED', error: 'push 실패', result: { coverage: { total: 1 } } };
    expect(거절된보고대신(400, { error: 'BAD_COVERAGE' }, 거절)).toEqual({ status: 'STOPPED', stopReason: 'REJECTED', error: 'push 실패' });
  });
  it('본문 상한(413)에 걸린 몸에 셈이 있으면 셈만 뺀다 — 셈이 커서 넘친 것이다', () => {
    const 몸 = { status: 'DONE', prUrl: 'p', result: { coverage: { total: 1 } } };
    expect(거절된보고대신(413, null, 몸)).toEqual({ status: 'DONE', prUrl: 'p' });
    expect(거절된보고대신(413, null, { status: 'DONE' })).toBeNull();
  });
  it('셈이 없는 몸의 BAD_COVERAGE 는 다른 400 처럼 FAILED 다', () => {
    expect(거절된보고대신(400, { error: 'BAD_COVERAGE' }, { status: 'DONE' })).toMatchObject({ status: 'FAILED' });
  });
  it('400 이 아니면 바꾸지 않는다 — 409 는 이미 끝난 행이다', () => {
    expect(거절된보고대신(409, { error: 'NOT_RUNNING' }, { status: 'DONE' })).toBeNull();
    expect(거절된보고대신(200, { ok: true }, { status: 'DONE' })).toBeNull();
  });
});
