// 애플리케이션을 섞은 조립 검사 — 같은 프로젝트 접두사 허용 · API 부품 애플리케이션 · 모킹 무늬 제한 (SPEC 도메인/시나리오 §3.7 결정 13 · §7)

import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 섞였나, 쓰는접두사 } from './mixed.js';
import { type 카탈로그, 부품들모양, 조립검사 } from './validate.js';

const 칸 = { platforms: ['desktop' as const], isActive: true, skippable: [] as string[], titles: [] as string[], params: [] as string[] };
const 재료: 카탈로그 = new Map([
  ['SHOP-001', 칸],
  ['ADM-001', 칸],
  ['OTHER-001', 칸],
]);
const 허용 = ['SHOP', 'ADM'];

const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
const 모킹 = (urlPattern: string): ScenarioPart => ({ kind: 'mock', urlPattern, status: 200, contentType: 'application/json', body: '{}' });
const 검사 = (parts: ScenarioPart[], 허용목록: readonly string[] = 허용) => 조립검사(parts, 'desktop', 'SHOP', 재료, 허용목록);

describe('쓰는접두사 · 섞였나', () => {
  it('시작 애플리케이션이 맨 앞이고 중복이 없다. API 부품은 service 를 따른다', () => {
    const parts: ScenarioPart[] = [
      케이스('ADM-001'),
      케이스('SHOP-001'),
      케이스('ADM-001'),
      { kind: 'api', method: 'GET', path: '/x', expectStatus: 200, service: 'PAY' },
      { kind: 'api', method: 'GET', path: '/x', expectStatus: 200 },
    ];

    expect(쓰는접두사(parts, 'SHOP')).toEqual(['SHOP', 'ADM', 'PAY']);
  });

  it('시작 애플리케이션 밖의 단계가 하나라도 있으면 섞인 것이다 — 시작 애플리케이션만 쓰면 아니다', () => {
    expect(섞였나([케이스('SHOP-001'), { kind: 'wait', ms: 1 }], 'SHOP')).toBe(false);
    expect(섞였나([케이스('ADM-001')], 'SHOP')).toBe(true);
    expect(섞였나([케이스('SHOP-001'), { kind: 'api', method: 'GET', path: '/x', expectStatus: 200, service: 'SHOP' }], 'SHOP')).toBe(false);
  });
});

describe('애플리케이션을 섞은 조립 검사', () => {
  it('같은 프로젝트의 다른 애플리케이션 케이스와 그 애플리케이션을 부르는 API 단계는 통과한다', () => {
    const parts: ScenarioPart[] = [케이스('SHOP-001'), 케이스('ADM-001'), { kind: 'api', method: 'GET', path: '/orders', expectStatus: 200, service: 'ADM' }];

    expect(부품들모양.safeParse(parts).success).toBe(true);
    expect(검사(parts)).toEqual([]);
  });

  it('허용 목록을 안 주면 시작 애플리케이션 하나다 — 앞 판 문장 그대로 거절한다', () => {
    expect(조립검사([케이스('ADM-001')], 'desktop', 'SHOP', 재료)).toEqual(['1번 단계: ADM-001 는 SHOP 서비스의 케이스가 아니다']);
  });

  it('다른 프로젝트 애플리케이션의 케이스를 거절한다', () => {
    expect(검사([케이스('OTHER-001')])).toEqual(['1번 단계: OTHER-001 는 SHOP 서비스와 같은 프로젝트의 애플리케이션 케이스가 아니다']);
  });

  it('같은 프로젝트가 아닌 애플리케이션을 부르는 API 단계를 거절한다', () => {
    const parts: ScenarioPart[] = [{ kind: 'api', method: 'GET', path: '/x', expectStatus: 200, service: 'OTHER' }];

    expect(검사(parts)).toEqual(['1번 단계: API 호출의 애플리케이션 OTHER 는 SHOP 서비스와 같은 프로젝트가 아니다']);
  });

  it('시작 애플리케이션 밖의 단계가 있으면 / 로 시작하는 모킹 · 모킹 끄기 무늬를 거절한다', () => {
    const 사유 = (n: number) => `${n}번 단계: 시작 애플리케이션 밖의 단계가 섞인 시나리오는 / 로 시작하는 URL 패턴을 쓸 수 없다. **/ 로 시작하거나 주소 전체를 적는다`;

    expect(검사([케이스('ADM-001'), 모킹('/api/pay'), { kind: 'unmock', urlPattern: '/api/pay' }])).toEqual([사유(2), 사유(3)]);
  });

  it('섞이지 않았거나 / 로 시작하지 않는 무늬는 받는다', () => {
    expect(검사([케이스('SHOP-001'), 모킹('/api/pay')])).toEqual([]);
    expect(검사([케이스('ADM-001'), 모킹('**/api/pay'), 모킹('https://pay.example.com/**'), { kind: 'unmock', urlPattern: '**/api/pay' }])).toEqual([]);
  });
});

describe('API 호출 단계의 API 인증 · 값 주입 · 응답 값 확인 (결정 14)', () => {
  const 가입아이디 = { fromSeq: 1, method: 'POST' as const, urlPattern: '**/api/auth/signup', jsonPath: 'loginId' };
  const API = (덧: Partial<Extract<ScenarioPart, { kind: 'api' }>>): ScenarioPart => ({ kind: 'api', method: 'GET', path: '/v1/pushes?userId={아이디}', expectStatus: 200, service: 'ADM', ...덧 });

  it('앞 케이스 · API 호출 단계를 가리키는 값 주입과 인증 이름 · 응답 값 확인을 받고 저장 모양이 칸을 지킨다', () => {
    const parts: ScenarioPart[] = [
      케이스('SHOP-001'),
      API({ method: 'POST', path: '/v1/devices', auth: '데모마켓', body: { userId: '{아이디}' }, values: [{ name: '아이디', value: 가입아이디 }] }),
      API({ method: 'DELETE', path: '/v1/devices/{기기}', auth: '데모마켓', values: [{ name: '기기', value: { fromSeq: 2, method: 'POST', urlPattern: '**', jsonPath: 'id' } }], expectJson: [{ jsonPath: 'items.0.title', equals: '주문이 완료되었습니다' }] }),
    ];

    expect(검사(parts)).toEqual([]);
    expect(부품들모양.parse(parts)).toEqual(parts);
  });

  it('뒤 단계 · 모킹 단계를 가리키는 값 주입, 틀린 이름, 겹친 이름, 너무 긴 인증 이름을 거절한다', () => {
    const parts: ScenarioPart[] = [
      모킹('**/x'),
      API({
        auth: '가'.repeat(21),
        values: [
          { name: '아이디', value: { ...가입아이디, fromSeq: 3 } },
          { name: '아이디', value: { ...가입아이디, fromSeq: 1 } },
          { name: 'user id', value: 가입아이디 },
        ],
      }),
      { kind: 'unmock', urlPattern: '**/x' },
    ];

    expect(검사(parts)).toEqual([
      '2번 단계: API 인증 이름은 1~20자다',
      '2번 단계: 값 주입이 가리키는 3번 단계는 자기보다 앞의 케이스 · API 호출 단계가 아니다',
      '2번 단계: 값 주입 이름 「아이디」 이 둘 이상이다',
      '2번 단계: 값 주입이 가리키는 1번 단계는 자기보다 앞의 케이스 · API 호출 단계가 아니다',
      '2번 단계: 값 주입 이름 「user id」 은 영문 · 숫자 · 한글 · _ 1~20자여야 한다',
      '2번 단계: 값 주입이 가리키는 1번 단계는 자기보다 앞의 케이스 · API 호출 단계가 아니다',
    ]);
  });

  it('API 호출 단계를 가리키며 메서드가 다른 값 주입과, 경로 · 본문에 자리가 없는 이름을 거절한다', () => {
    const parts: ScenarioPart[] = [
      API({ method: 'POST', path: '/v1/devices' }),
      API({ path: '/v1/devices/{기기id}', values: [{ name: '기기', value: { fromSeq: 1, method: 'GET', urlPattern: '**', jsonPath: 'id' } }] }),
    ];

    expect(검사(parts)).toEqual([
      '2번 단계: 값 주입이 가리키는 1번 단계는 POST 요청이다',
      '2번 단계: 값 주입 이름 「기기」 자리 {기기} 가 경로 · 본문에 없다',
    ]);
  });
});
