// 부품 흐름 검사 ② — 케이스 부품마다 새 창 · 이어 주기 오류 · 값 꽂기 · 끝의 뒷정리를 가짜 창으로 본다 (SPEC 도메인/시나리오 §3.7 결정 3 · 12)

import type { ScenarioExecuteRequest } from '@platform/kit';
import { describe, expect, it, vi } from 'vitest';

import { type 미룬삭제 } from './links.js';
import { runParts } from './parts.js';
import { 쿠키, 창들 } from './parts-fake.js';

type Part = ScenarioExecuteRequest['parts'][number];

const 케이스 = (tcId = 'XRS-001', skipSteps: string[] = []): Extract<Part, { kind: 'case' }> => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps, filePath: `/tests/${tcId}.spec.ts`,
});

describe('runParts — 새 창 · 시험 한도 · 이어 주기 · 뒷정리 (SPEC 도메인/시나리오 §3.7 결정 3 · 12)', () => {
  const 모킹: Part = { kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body: '' };
  const 첫글 = { fromSeq: 1, method: 'POST', urlPattern: '**/api/posts', jsonPath: 'id' } as const;

  it('케이스 부품마다 앞 창 상태를 넘겨 새 창을 열고 앞 창을 닫는다 — 넘겨받기를 끄면 상태 없이 · 걸린 모킹을 넘긴다 · 다른 부품은 창을 안 연다', async () => {
    const parts: Part[] = [
      { kind: 'api', method: 'POST', path: '/api/seed', expectStatus: 200 },
      모킹,
      케이스('XRS-001'),
      { kind: 'wait', ms: 7 },
      { ...케이스('XRS-002'), carryOver: false },
    ];
    const { deps, 받은, 줄 } = 창들(parts);

    await runParts(parts, deps);

    expect(줄.map((r) => r.status)).toEqual(['PASS', 'PASS', 'PASS', 'PASS', 'PASS']);
    expect(받은.map((w) => [w.state, w.mocks, w.부품?.seq])).toEqual([
      [undefined, [], undefined],
      [{ cookies: [쿠키('창0')], origins: [] }, ['**/a'], 3],
      [undefined, ['**/a'], 5],
    ]);
    expect(받은[0]!.창.fetch).toHaveBeenCalledWith('https://qa.example.com/api/seed', { method: 'POST' });
    expect(받은[0]!.창.route).toHaveBeenCalledWith('**/a', expect.any(Function));
    expect(받은[1]!.창.waitForTimeout).toHaveBeenCalledWith(7);
    expect(받은.map((w) => vi.mocked(w.창.close).mock.calls.length)).toEqual([1, 1, 1]);
    expect(vi.mocked(받은[0]!.창.close).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(받은[1]!.창.runCase).mock.invocationCallOrder[0]!);
  });

  it('API 쪽 모킹 표도 같이 고친다 — 같은 무늬를 다시 걸면 맨 뒤로, 끄면 뺀다', async () => {
    const parts: Part[] = [
      모킹,
      { kind: 'mock', urlPattern: '**/b', status: 500, contentType: 'application/json', body: '{"b":1}' },
      { ...모킹, body: '둘째' },
      { kind: 'unmock', urlPattern: '**/b' },
    ];
    const { deps, 이음 } = 창들(parts);

    await runParts(parts, deps);

    expect([...이음.모킹]).toEqual([['**/a', { status: 200, contentType: 'text/plain', body: '둘째' }]]);
  });

  describe('이어 주기 오류 · 안 걸린 이어 주기 (결정 12)', () => {
    it('이음 오류가 있으면 케이스가 통과로 끝나도 FAIL 이고 사유를 맨 앞에, 안 걸린 이어 주기를 줄 바꿔 덧붙인다', async () => {
      const parts: Part[] = [{ ...케이스('XRS-001'), links: [
        { kind: 'reuse', method: 'POST', urlPattern: '**/api/posts', fromSeq: 1 },
        { kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' },
      ] }];
      const { deps, 줄 } = 창들(parts, {
        창마다: (n, 부품) => (n !== 1 ? {} : {
          runCase: vi.fn(async (_part, seq: number) => {
            부품!.걸림.add(0);
            부품!.오류 ??= '1번 부품에 맞는 응답이 없다';
            return { seq, steps: [], failed: false };
          }),
        }),
      });

      await runParts(parts, deps);

      expect(줄[0]).toMatchObject({ status: 'FAIL', error: { message: '1번 부품에 맞는 응답이 없다\n안 걸린 이어 주기 — 요청 막기 DELETE **/api/cart' } });
    });

    it('케이스 오류도 있으면 이음 오류 뒤에 잇는다', async () => {
      const parts: Part[] = [{ ...케이스('XRS-001'), links: [{ kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' }] }];
      const { deps, 줄 } = 창들(parts, {
        창마다: (n, 부품) => (n !== 1 ? {} : {
          runCase: vi.fn(async (_part, seq: number) => {
            부품!.걸림.add(0);
            부품!.오류 ??= '1번 부품 응답에 id 가 없다';
            return { seq, steps: [], failed: true, error: { message: 'net::ERR_FAILED' } };
          }),
        }),
      });

      await runParts(parts, deps);

      expect(줄[0]!.error?.message).toBe('1번 부품 응답에 id 가 없다 · net::ERR_FAILED');
    });

    it('이음 오류 없이 실패해도 안 걸린 이어 주기를 덧붙인다 · 통과면 안 붙인다', async () => {
      const 실패: Part[] = [{ ...케이스('XRS-001'), links: [{ kind: 'block', method: 'DELETE', urlPattern: '**/api/cart' }] }];
      const 가 = 창들(실패, {
        창마다: (n) => (n !== 1 ? {} : { runCase: vi.fn(async (_part, seq: number) => ({ seq, steps: [], failed: true, error: { message: '화면이 안 떴다' } })) }),
      });
      await runParts(실패, 가.deps);
      const 나 = 창들(실패);
      await runParts(실패, 나.deps);

      expect(가.줄[0]!.error?.message).toBe('화면이 안 떴다\n안 걸린 이어 주기 — 요청 막기 DELETE **/api/cart');
      expect(나.줄[0]).toMatchObject({ status: 'PASS' });
      expect(나.줄[0]!.error).toBeUndefined();
    });
  });

  describe('값 꽂기', () => {
    it('앞 응답 값을 입력값 칸에 넣어 부르고 결과에 bound 를 싣는다', async () => {
      const parts: Part[] = [케이스('XRS-001'), { ...케이스('XRS-002'), params: { 제목: '둘' }, links: [{ kind: 'bind', param: '글번호', value: 첫글 }] }];
      const { deps, 받은, 줄, 이음 } = 창들(parts);
      이음.응답.set('1 POST **/api/posts', Promise.resolve({ status: 201, contentType: 'application/json', body: '{"id":812}' }));

      await runParts(parts, deps);

      expect(받은[2]!.창.runCase).toHaveBeenCalledWith(expect.objectContaining({ tcId: 'XRS-002' }), 1, expect.objectContaining({ started: false }), { 제목: '둘', 글번호: 812 });
      expect(줄[1]).toMatchObject({ status: 'PASS', bound: { 글번호: 812 } });
      expect(줄[0]!.bound).toBeUndefined();
    });

    it('못 꽂으면 창을 안 열고 케이스를 안 돌리고 FAIL 로 멈춘다', async () => {
      const parts: Part[] = [케이스('XRS-001'), { ...케이스('XRS-002'), links: [{ kind: 'bind', param: '글번호', value: 첫글 }] }, { kind: 'wait', ms: 1 }];
      const { deps, 받은, 줄 } = 창들(parts);

      await runParts(parts, deps);

      expect(받은).toHaveLength(2);
      expect(줄.map((r) => [r.seq, r.status, r.error?.message])).toEqual([[1, 'PASS', undefined], [2, 'FAIL', '1번 부품에 맞는 응답이 없다']]);
    });
  });

  describe('뒷정리 (결정 5 · 15)', () => {
    const 미룸 = (fromSeq: number, url: string): 미룬삭제 => ({ fromSeq, url, headers: {}, state: { cookies: [], origins: [] } });

    it('미룬 삭제를 끝에 거꾸로 보내고 뒷정리 줄을 흘린다 — 실패로 멈춰도 · 하나가 던져도 나머지를 보낸다 · 보내기 전에 얼린다', async () => {
      const parts: Part[] = [케이스('XRS-001'), 케이스('XRS-002'), { kind: 'wait', ms: 1 }];
      const { deps, 뒷정리, 이음 } = 창들(parts, {
        창마다: (n) => (n === 0 ? {} : {
          runCase: vi.fn(async (_part, seq: number) => {
            이음.미룸.push(미룸(n, `https://qa.example.com/api/posts/${n}`));
            return { seq, steps: [], failed: n === 2 };
          }),
        }),
      });
      const 얼림때: boolean[] = [];
      deps.sendDelete = vi.fn(async (d: 미룬삭제) => {
        얼림때.push(이음.얼림);
        if (d.fromSeq === 2) throw new Error('연결이 끊겼다');
        return 401;
      });

      await runParts(parts, deps);

      expect(vi.mocked(deps.sendDelete).mock.calls.map(([d]) => d.fromSeq)).toEqual([2, 1]);
      expect(얼림때).toEqual([true, true]);
      expect(뒷정리).toEqual([[
        { fromSeq: 2, method: 'DELETE', url: 'https://qa.example.com/api/posts/2', error: '연결이 끊겼다' },
        { fromSeq: 1, method: 'DELETE', url: 'https://qa.example.com/api/posts/1', status: 401 },
      ]]);
    });

    it('미룬 삭제가 없어도 빈 뒷정리 줄을 흘린다 — 「없었다」와 「끊겨서 모른다」를 가른다', async () => {
      const parts: Part[] = [케이스('XRS-001')];
      const { deps, 뒷정리 } = 창들(parts);

      await runParts(parts, deps);

      expect(뒷정리).toEqual([[]]);
    });
  });
});
