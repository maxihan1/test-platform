// 앱 · 게임 시나리오의 폰 값 · 잡는 시간 · 못 돌린 응답 (SPEC 도메인/시나리오 §3.7 결정 16)

import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import type { 쓰는앱 } from './apps.js';
import { 못돌린응답, 잡는분, 폰값 } from './phone.js';

const 앱 = (kind: string, 더: Partial<쓰는앱> = {}): 쓰는앱 => ({
  serviceId: 7,
  baseUrl: 'http://x',
  계정들: [],
  apiAuths: [],
  kind,
  appPath: '/apps/a.apk',
  adminKey: null,
  ...더,
});
const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });

describe('폰값', () => {
  it('앱 · 게임 단계가 없으면 null 이다', () => {
    expect(폰값([케이스('OPS-001')], new Map([['OPS', 앱('SCREEN')]]), 'stg')).toBeNull();
  });

  it('Android 앱 단계면 그 애플리케이션의 앱 파일 재료를 주고 게임 칸은 비운다', () => {
    const 앱들 = new Map([['OPS', 앱('SCREEN', { serviceId: 1 })], ['DMA', 앱('APP', { serviceId: 2 })]]);

    expect(폰값([케이스('OPS-001'), 케이스('DMA-001')], 앱들, 'stg')).toEqual({ 폰: { serviceId: 2, env: 'stg', appPath: '/apps/a.apk' }, 칸: {} });
  });

  it('게임 단계면 엔진과 그 대상 서버 줄의 어드민 키를 한 벌 싣는다', () => {
    const 키 = { header: 'X-Admin', value: 's3cret' };

    expect(폰값([케이스('ASH-001')], new Map([['ASH', 앱('GAME', { adminKey: 키 })]]), 'qa')?.칸).toEqual({ engine: 'GAME', adminKey: 키 });
  });
});

describe('잡는분', () => {
  it('제한 시간에 10분을 더한 값이 들어가는 가장 짧은 잡기다', () => {
    expect(잡는분(60_000)).toBe(30);
    expect(잡는분(20 * 60_000)).toBe(30);
    expect(잡는분(21 * 60_000)).toBe(60);
    expect(잡는분(60 * 60_000)).toBe(120);
  });
});

describe('못돌린응답', () => {
  it('첫 단계는 까닭을 지닌 NA, 뒤 단계는 NOT_RUN 이다', () => {
    const 응답 = 못돌린응답(3, '디바이스 팜에 빈 폰이 없습니다');

    expect(응답.status).toBe('NA');
    expect(응답.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([
      [1, 'NA', '디바이스 팜에 빈 폰이 없습니다'],
      [2, 'NA', 'NOT_RUN'],
      [3, 'NA', 'NOT_RUN'],
    ]);
  });
});
