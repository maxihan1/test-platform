// 앱 · 게임 단계 조립 검사 — 디바이스 android · 단계별 선언 · 앱 하나 · 못 거는 이어 주기 · 모킹 구간 (SPEC 도메인/시나리오 §3.7 결정 16 · §7)

import type { Platform, ScenarioLink, ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 앱단계인가 } from './mixed.js';
import { type 카탈로그, 조립검사 } from './validate.js';

const 칸 = (platforms: Platform[]) => ({ platforms, isActive: true, skippable: [] as string[], titles: [] as string[], params: ['orderId'] });
const 재료: 카탈로그 = new Map([
  ['DMA-001', 칸(['android'])],
  ['DMA-002', 칸(['android'])],
  ['ASH-001', 칸(['android'])],
  ['OPS-001', 칸(['desktop'])],
  ['OPS-002', 칸(['mobile'])],
]);
const 허용 = ['DMA', 'ASH', 'OPS'];
const 종류 = new Map([
  ['DMA', 'APP'],
  ['ASH', 'GAME'],
] as const);

const 케이스 = (tcId: string, 더: Partial<Extract<ScenarioPart, { kind: 'case' }>> = {}): ScenarioPart => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...더,
});
const 값꽂기: ScenarioLink = { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'POST', urlPattern: '**/orders', jsonPath: '$.id' } };
const 검사 = (parts: ScenarioPart[], platform: Platform = 'android', 시작 = 'DMA') => 조립검사(parts, platform, 시작, 재료, 허용, 종류);

describe('앱 · 게임 단계 조립 검사', () => {
  it('앱 단계 → 웹(PC) 단계 → 앱 단계는 통과한다 — android 시나리오의 웹 단계는 PC 선언을 본다', () => {
    expect(검사([케이스('DMA-001'), 케이스('OPS-001'), 케이스('DMA-002', { links: [값꽂기] })])).toEqual([]);
  });

  it('android 시나리오의 웹 단계가 PC 를 선언하지 않았으면 거절한다', () => {
    expect(검사([케이스('DMA-001'), 케이스('OPS-002')])).toEqual(['2번 단계: OPS-002 는 desktop 을 선언하지 않았다']);
  });

  it('PC 시나리오에 섞은 앱 단계는 android 선언을 본다', () => {
    expect(검사([케이스('OPS-001'), 케이스('DMA-001')], 'desktop', 'OPS')).toEqual([]);
  });

  it('앱 · 게임 애플리케이션이 시작이면 디바이스는 android 하나고, 웹이 시작이면 android 를 못 고른다', () => {
    expect(검사([케이스('DMA-001')], 'desktop')).toEqual(['DMA 는 Android 앱 · 게임 애플리케이션이라 디바이스는 android 만 고른다']);
    expect(검사([케이스('OPS-001')], 'android', 'OPS')).toEqual(['OPS 는 Android 앱 · 게임 애플리케이션이 아니라 android 를 고를 수 없다']);
  });

  it('앱 · 게임 애플리케이션이 둘이면 거절한다 — 폰 연결 하나에 앱 하나다', () => {
    expect(검사([케이스('DMA-001'), 케이스('ASH-001')])).toEqual(['앱 · 게임 애플리케이션은 한 시나리오에 하나다: DMA · ASH']);
  });

  it('앱 단계에 앞 응답 돌려주기 · 요청 막기 · 바꿔 보내기를 걸면 거절한다', () => {
    const 막기: ScenarioLink = { kind: 'block', method: 'GET', urlPattern: '**/orders' };

    expect(검사([케이스('DMA-001'), 케이스('DMA-002', { links: [막기] })])).toEqual([
      '2번 단계: 앱 · 게임 단계에는 값 꽂기만 건다 — 앞 응답 돌려주기 · 요청 막기 · 바꿔 보내기는 앱 요청에 안 걸린다',
    ]);
  });

  it('앱 단계의 넘겨받기를 끄면 거절한다', () => {
    expect(검사([케이스('DMA-001', { carryOver: false })])).toEqual(['1번 단계: 앱 · 게임 단계는 넘겨받기를 끌 수 없다 — 끄려면 앱을 다시 켜야 한다']);
  });

  it('모킹 구간 안의 앱 단계는 거절하고, 모킹을 끈 뒤의 앱 단계는 통과한다', () => {
    const 모킹: ScenarioPart = { kind: 'mock', urlPattern: '**/pay', status: 200, contentType: 'application/json', body: '{}' };
    const 끄기: ScenarioPart = { kind: 'unmock', urlPattern: '**/pay' };

    expect(검사([모킹, 케이스('DMA-001'), 끄기])).toEqual(['2번 단계: 앱 · 게임 단계가 모킹 구간 안에 있다 — 모킹은 앱 단계 앞에서 끈다']);
    expect(검사([모킹, 케이스('OPS-001'), 끄기, 케이스('DMA-001')])).toEqual([]);
  });

  it('앱 · 게임 단계는 케이스 번호 앞 글자의 애플리케이션 종류로 가른다', () => {
    expect(앱단계인가(케이스('ASH-001'), 종류)).toBe(true);
    expect(앱단계인가(케이스('OPS-001'), 종류)).toBe(false);
    expect(앱단계인가({ kind: 'wait', ms: 1 }, 종류)).toBe(false);
  });
});
