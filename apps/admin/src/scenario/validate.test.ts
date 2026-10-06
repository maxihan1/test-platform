// 조립 검사 — 400 으로 거절할 조립을 가린다 (SPEC 도메인/시나리오 §7 「400 으로 거절하는 조립」)

import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { type 카탈로그, 부품들모양, 시나리오제한시간, 조립검사 } from './validate.js';

const 카탈로그재료: 카탈로그 = new Map([
  ['SHOP-001', { platforms: ['desktop'], isActive: true, skippable: ['상품을 담는다'], titles: ['상품을 담는다', '로그인 확인'], params: [] }],
  ['SHOP-002', { platforms: ['desktop', 'mobile'], isActive: true, skippable: [], titles: ['상품을 담는다'], params: ['todoId', 'title'] }],
  ['SHOP-003', { platforms: ['desktop'], isActive: false, skippable: [], titles: [], params: [] }],
  ['OTHER-001', { platforms: ['desktop'], isActive: true, skippable: [], titles: [], params: [] }],
]);

const 케이스 = (tcId: string, skipSteps: string[] = []): ScenarioPart => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps,
});

const 검사 = (parts: ScenarioPart[], platform: 'desktop' | 'mobile' = 'desktop') =>
  조립검사(parts, platform, 'SHOP', 카탈로그재료);

describe('조립 검사', () => {
  it('모든 부품 종류를 담은 조립은 통과한다', () => {
    const parts: ScenarioPart[] = [
      { kind: 'api', method: 'POST', path: '/api/points', body: { amount: 100 }, expectStatus: 200 },
      { kind: 'mock', urlPattern: '**/api/pay', status: 200, contentType: 'application/json', body: '{}' },
      케이스('SHOP-001', ['상품을 담는다']),
      { kind: 'wait', ms: 1000 },
      { kind: 'unmock', urlPattern: '**/api/pay' },
      케이스('SHOP-002'),
    ];
    expect(부품들모양.safeParse(parts).success).toBe(true);
    expect(검사(parts)).toEqual([]);
  });

  it('비었으면 거절한다', () => {
    expect(검사([])).toHaveLength(1);
  });

  it('그 서비스 접두사가 아닌 케이스는 있는지 보기 전에 거절한다', () => {
    const 오류 = 검사([케이스('OTHER-001'), 케이스('OTHER-999')]);
    expect(오류).toHaveLength(2);
    for (const 문장 of 오류) expect(문장).toMatch(/SHOP 서비스의 케이스가 아니다/);
  });

  it('UI 테스트는 재료를 보기 전에 거절한다 — E2E 부품은 기능 테스트만이다', () => {
    expect(검사([케이스('SHOP-UI-001')])).toEqual(['1번 부품: SHOP-UI-001 는 UI 테스트라 E2E 부품이 될 수 없다']);
  });

  it('없는 케이스와 비활성 케이스는 거절한다', () => {
    const 오류 = 검사([케이스('SHOP-999'), 케이스('SHOP-003')]);
    expect(오류).toHaveLength(2);
    for (const 문장 of 오류) expect(문장).toMatch(/없거나 비활성/);
  });

  it('시나리오 디바이스를 선언하지 않은 케이스는 거절한다', () => {
    expect(검사([케이스('SHOP-001')], 'mobile')).toEqual([expect.stringMatching(/mobile/)]);
    expect(검사([케이스('SHOP-002')], 'mobile')).toEqual([]);
  });

  it('건너뛸 수 없는 절차를 건너뛰면 거절한다', () => {
    expect(검사([케이스('SHOP-001', ['로그인 확인'])])).toEqual([expect.stringMatching(/로그인 확인/)]);
    expect(검사([케이스('SHOP-002', ['상품을 담는다'])])).toHaveLength(1);
  });

  it('케이스에 아예 없는 제목의 건너뛰기는 거절하지 않는다 — 실행이 무시한다 (결정 8)', () => {
    expect(검사([케이스('SHOP-001', ['사라진 절차'])])).toEqual([]);
    expect(검사([케이스('SHOP-001', ['사라진 절차', '로그인 확인'])])).toEqual([expect.stringMatching(/로그인 확인/)]);
  });

  it('켜져 있는 같은 무늬가 없는 모킹 끄기는 짝이 없다', () => {
    const 켬 = { kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body: '' } as const;
    const 끔 = (urlPattern: string) => ({ kind: 'unmock', urlPattern }) as const;
    // 켜기보다 앞선 끄기
    expect(검사([끔('**/a'), 켬])).toHaveLength(1);
    // 다른 무늬
    expect(검사([켬, 끔('**/b')])).toHaveLength(1);
    // 끈 뒤 다시 끄기
    expect(검사([켬, 끔('**/a'), 끔('**/a')])).toHaveLength(1);
    expect(검사([켬, 끔('**/a'), 켬, 끔('**/a')])).toEqual([]);
  });

  it('대기는 0 보다 크고 60000 이하다', () => {
    expect(검사([{ kind: 'wait', ms: 0 }])).toHaveLength(1);
    expect(검사([{ kind: 'wait', ms: -5 }])).toHaveLength(1);
    expect(검사([{ kind: 'wait', ms: 60001 }])).toHaveLength(1);
    expect(검사([{ kind: 'wait', ms: 60000 }])).toEqual([]);
  });

  it('API 경로는 / 로 시작하고 // 로 시작하지 않는다', () => {
    const api = (path: string): ScenarioPart => ({ kind: 'api', method: 'GET', path, expectStatus: 200 });
    expect(검사([api('api/x')])).toHaveLength(1);
    expect(검사([api('https://evil.test/x')])).toHaveLength(1);
    expect(검사([api('//evil.test/x')])).toHaveLength(1);
    expect(검사([api('/\\evil.test/x')])).toHaveLength(1);
    expect(검사([api('/\t/evil.test/x')])).toHaveLength(1);
    expect(검사([api('/api/x\n')])).toHaveLength(1);
    expect(검사([api('/api/x\x7f')])).toHaveLength(1);
    expect(검사([api('/api/x')])).toEqual([]);
    expect(검사([api('/api/x?q=1&a=%2F')])).toEqual([]);
  });

  it('제한 시간 합이 60분이면 통과하고 1ms 넘으면 거절한다', () => {
    const 열둘 = Array.from({ length: 12 }, () => 케이스('SHOP-002'));
    expect(시나리오제한시간(열둘)).toBe(3600000);
    expect(검사(열둘)).toEqual([]);

    const 넘침: ScenarioPart[] = [...열둘, { kind: 'wait', ms: 1 }];
    expect(시나리오제한시간(넘침)).toBe(3600001);
    expect(검사(넘침)).toEqual([expect.stringMatching(/제한 시간/)]);
  });
});

describe('제한 시간 바닥 · API 몫 · 크기 상한', () => {
  const api: ScenarioPart = { kind: 'api', method: 'GET', path: '/api/x', expectStatus: 200 };

  it('합이 60000 보다 작으면 60000 으로 올리고 API 부품은 30000 씩 센다', () => {
    expect(시나리오제한시간([api])).toBe(60000);
    expect(시나리오제한시간([{ kind: 'wait', ms: 1 }])).toBe(60000);
    expect(시나리오제한시간([케이스('SHOP-002'), api])).toBe(330000);
  });

  it('60분 상한은 바닥 올리기 전 합으로 본다', () => {
    const 케이스들 = (n: number) => Array.from({ length: n }, () => 케이스('SHOP-002'));
    expect(검사(케이스들(12))).toEqual([]);
    expect(검사(케이스들(13))).toEqual([expect.stringMatching(/제한 시간/)]);
    expect(검사([...케이스들(12), api])).toEqual([expect.stringMatching(/3630000ms/)]);
  });

  it('부품 목록 JSON 이 100000 바이트를 넘으면 거절한다', () => {
    const 모킹 = (body: string): ScenarioPart[] => [
      { kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body },
    ];
    const 바탕 = Buffer.byteLength(JSON.stringify(모킹('')));
    // 한글 한 글자는 3바이트다 — 나머지는 ASCII 로 맞춘다
    const 크기에맞춘 = (목표: number) => {
      const 남은 = 목표 - 바탕;
      return 모킹('가'.repeat(Math.floor(남은 / 3)) + 'a'.repeat(남은 % 3));
    };
    expect(Buffer.byteLength(JSON.stringify(크기에맞춘(100000)))).toBe(100000);
    expect(검사(크기에맞춘(100000))).toEqual([]);
    expect(검사(크기에맞춘(100001))).toEqual([expect.stringMatching(/100000바이트/)]);
  });
});

describe('부품 모양', () => {
  it('모르는 kind 는 거절한다', () => {
    expect(부품들모양.safeParse([{ kind: 'sleep', ms: 10 }]).success).toBe(false);
  });

  it('칸이 모자라거나 모양이 다르면 거절한다', () => {
    for (const 부품 of [
      { kind: 'case', tcId: 'SHOP-001', params: {}, expected: {} },
      { kind: 'api', method: 'OPTIONS', path: '/x', expectStatus: 200 },
      { kind: 'api', method: 'GET', path: '/x', expectStatus: 200.5 },
      { kind: 'mock', urlPattern: '**', status: 99, contentType: 'text/plain', body: '' },
      { kind: 'mock', urlPattern: '**', status: 600, contentType: 'text/plain', body: '' },
      { kind: 'unmock' },
      { kind: 'mock', urlPattern: '', status: 200, contentType: 'text/plain', body: '' },
      { kind: 'unmock', urlPattern: '' },
      { kind: 'wait', ms: '10' },
    ]) {
      expect(부품들모양.safeParse([부품]).success, JSON.stringify(부품)).toBe(false);
    }
  });

  const 값 = { fromSeq: 1, method: 'GET', urlPattern: '**/api/todos', jsonPath: 'data.id' } as const;

  it('넘겨받기와 이어 주기 넷은 모양 검사를 지나도 그대로 남는다', () => {
    const parts: ScenarioPart[] = [
      { kind: 'case', tcId: 'SHOP-001', params: {}, expected: {}, skipSteps: [], carryOver: false },
      {
        kind: 'case',
        tcId: 'SHOP-002',
        params: {},
        expected: {},
        skipSteps: [],
        links: [
          { kind: 'reuse', method: 'GET', urlPattern: '**/api/todos', fromSeq: 1 },
          { kind: 'block', method: 'DELETE', urlPattern: '**/api/todos/*' },
          { kind: 'rewrite', method: 'POST', urlPattern: '**/api/todos', to: { method: 'PUT', path: '/api/todos/{}', value: 값 } },
          { kind: 'bind', param: 'todoId', value: 값 },
        ],
      },
    ];
    expect(부품들모양.parse(parts)).toEqual(parts);
  });

  it('이어 주기의 빈 무늬 · 빈 값 경로 · 모르는 메서드 · 0번 부품은 거절한다', () => {
    for (const 이어주기 of [
      { kind: 'reuse', method: 'GET', urlPattern: '', fromSeq: 1 },
      { kind: 'reuse', method: 'GET', urlPattern: '**/a', fromSeq: 0 },
      { kind: 'block', method: 'OPTIONS', urlPattern: '**/a' },
      { kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'POST', path: '/a/{}', value: 값 } },
      { kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'PUT', path: '/a/{}', value: { ...값, fromSeq: 0 } } },
      { kind: 'bind', param: 'todoId', value: { ...값, jsonPath: '' } },
      { kind: 'bind', param: 'todoId', value: { ...값, urlPattern: '' } },
    ]) {
      const 부품 = { ...케이스('SHOP-002'), links: [이어주기] };
      expect(부품들모양.safeParse([부품]).success, JSON.stringify(이어주기)).toBe(false);
    }
  });
});

describe('이어 주기 조립 (도메인/시나리오 §3.7 결정 12 · §7)', () => {
  const 값 = (fromSeq: number) => ({ fromSeq, method: 'GET', urlPattern: '**/api/todos', jsonPath: 'data.id' }) as const;
  const 넷 = (fromSeq: number): ScenarioLink[] => [
    { kind: 'reuse', method: 'GET', urlPattern: '**/api/todos', fromSeq },
    { kind: 'block', method: 'DELETE', urlPattern: '**/api/todos/*' },
    { kind: 'rewrite', method: 'POST', urlPattern: '**/api/todos', to: { method: 'PUT', path: '/api/todos/{}', value: 값(fromSeq) } },
    { kind: 'bind', param: 'todoId', value: 값(fromSeq) },
  ];
  const 이음 = (tcId: string, links: ScenarioLink[]): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], links });
  const 뒤에 = (tcId: string, links: ScenarioLink[]): ScenarioPart[] => [케이스('SHOP-001'), 이음(tcId, links)];

  it('넘겨받기를 켠 부품이 앞 케이스를 가리키는 이어 주기 넷은 통과한다 — 꽂을 칸에 조립 값이 있어도 된다', () => {
    const parts: ScenarioPart[] = [
      { kind: 'api', method: 'GET', path: '/api/x', expectStatus: 200 },
      케이스('SHOP-001'),
      { kind: 'case', tcId: 'SHOP-002', params: { todoId: 'x' }, expected: {}, skipSteps: [], carryOver: true, links: 넷(2) },
      이음('SHOP-002', 넷(3)),
    ];
    expect(검사(parts)).toEqual([]);
  });

  it('넘겨받기를 끈 부품에 건너뛰기나 이어 주기가 있으면 거절한다', () => {
    const 끈 = (skipSteps: string[], links: ScenarioLink[]): ScenarioPart[] => [
      케이스('SHOP-001'),
      { kind: 'case', tcId: 'SHOP-001', params: {}, expected: {}, skipSteps, carryOver: false, links },
    ];
    const 사유 = ['2번 부품: 넘겨받기를 끈 부품에는 건너뛰기와 이어 주기를 걸 수 없다'];
    const 막기: ScenarioLink = { kind: 'block', method: 'DELETE', urlPattern: '**/a' };
    expect(검사(끈(['상품을 담는다'], []))).toEqual(사유);
    expect(검사(끈([], [막기]))).toEqual(사유);
    expect(검사(끈(['상품을 담는다'], [막기]))).toEqual(사유);
    expect(검사(끈([], []))).toEqual([]);
  });

  it('이어 주기가 가리키는 부품이 자기보다 앞의 케이스 부품이 아니면 거절한다 — 돌려주기 · 바꿔 보내기 · 꽂기 셋 다', () => {
    const 앞뒤 = (link: ScenarioLink): ScenarioPart[] => [
      { kind: 'api', method: 'GET', path: '/api/x', expectStatus: 200 },
      { kind: 'mock', urlPattern: '**/a', status: 200, contentType: 'text/plain', body: '' },
      케이스('SHOP-001'),
      이음('SHOP-002', [link]),
      케이스('SHOP-001'),
    ];
    const 셋 = (n: number) => 넷(n).filter((l) => l.kind !== 'block');
    for (const link of 셋(3)) expect(검사(앞뒤(link)), JSON.stringify(link)).toEqual([]);
    for (const n of [1, 2, 4, 5, 99]) {
      for (const link of 셋(n)) {
        expect(검사(앞뒤(link)), JSON.stringify(link)).toEqual([
          `4번 부품: 이어 주기가 가리키는 ${n}번 부품은 자기보다 앞의 케이스 부품이 아니다`,
        ]);
      }
    }
  });

  it('값 꽂기 칸이 그 케이스 입력값에 없거나 한 칸에 꽂기가 둘이면 거절한다', () => {
    const 꽂기 = (param: string): ScenarioLink => ({ kind: 'bind', param, value: 값(1) });
    expect(검사(뒤에('SHOP-002', [꽂기('userId')]))).toEqual(['2번 부품: 「userId」 는 SHOP-002 의 입력값 칸이 아니다']);
    expect(검사(뒤에('SHOP-001', [꽂기('todoId')]))).toEqual(['2번 부품: 「todoId」 는 SHOP-001 의 입력값 칸이 아니다']);
    expect(검사(뒤에('SHOP-002', [꽂기('todoId'), 꽂기('todoId'), 꽂기('todoId')]))).toEqual([
      '2번 부품: 「todoId」 칸에 값 꽂기가 둘 이상이다',
    ]);
    expect(검사(뒤에('SHOP-002', [꽂기('todoId'), 꽂기('title')]))).toEqual([]);
  });

  it('바꿔 보내기 고치기 주소가 API 경로 규칙을 어기거나 {} 가 꼭 하나가 아니면 거절한다', () => {
    const 바꿔 = (path: string) =>
      뒤에('SHOP-002', [{ kind: 'rewrite', method: 'POST', urlPattern: '**/a', to: { method: 'PATCH', path, value: 값(1) } }]);
    for (const path of ['api/{}', 'https://evil.test/{}', '//evil.test/{}', '/\\evil.test/{}', '/\t/{}', '/a/{}\n', '/a/{}\x7f']) {
      expect(검사(바꿔(path)), JSON.stringify(path)).toEqual([
        '2번 부품: 바꿔 보내기 경로는 / 로 시작하고 // 로 시작하지 않으며 \\ 와 제어문자가 없어야 한다',
      ]);
    }
    for (const path of ['/a', '/a/{}/{}']) {
      expect(검사(바꿔(path)), path).toEqual(['2번 부품: 바꿔 보내기 경로에 {} 자리가 꼭 하나 있어야 한다']);
    }
    expect(검사(바꿔('/api/todos/{}?q=1'))).toEqual([]);
  });
});
