import type { ScenarioPart } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 경과글, 목록줄들, 번호꼬리, 시험이름줄들, 지금번호 } from './e2eWindowView.js';
import type { CasePartMaterial } from './scenarioApi.js';

const 케이스 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });
const 이름들 = [{ 꼬리: 'FN-087', 제목: '로그인' }, { 꼬리: 'FN-213', 제목: '장바구니' }, { 꼬리: 'FN-234', 제목: '주문' }];

describe('번호꼬리', () => {
  it('접두사를 떼고 두 마디만 남긴다', () => {
    expect(번호꼬리('DMW-FN-087')).toBe('FN-087');
    expect(번호꼬리('ZSB-001')).toBe('ZSB-001');
  });
});

describe('시험이름줄들', () => {
  it('케이스는 재료 이름과 번호 꼬리, 다른 단계는 종류 이름과 요약이다', () => {
    const 재료 = new Map<string, CasePartMaterial | null>([['DMW-FN-087', { name: '로그인' } as CasePartMaterial]]);
    const 줄 = 시험이름줄들([케이스('DMW-FN-087'), 케이스('DMW-FN-999'), { kind: 'wait', ms: 3000 }], 재료, 'ko');
    expect(줄).toEqual([
      { 꼬리: 'FN-087', 제목: '로그인' },
      { 꼬리: 'FN-999', 제목: 'DMW-FN-999' },
      { 꼬리: '대기', 제목: '3초 기다림' },
    ]);
  });
});

describe('목록줄들', () => {
  it('러너가 아직 안 알렸으면 1단계가 기다리는 중이다', () => {
    const 줄 = 목록줄들(이름들, [], true);
    expect(줄[0]).toMatchObject({ seq: 1, 상태: 'now', 기다림: true, 꼬리: 'FN-087' });
    expect(줄[1]?.상태).toBe('wait');
    expect(지금번호(줄)).toBe(1);
  });

  it('끝난 단계는 걸린 시간, 지금 단계는 경과, 남은 단계는 기다림이다', () => {
    const 쌓임 = [
      { seq: 1, title: '', elapsedMs: 1500, 시작: 1000 },
      { seq: 2, title: '', elapsedMs: 4000, 시작: 2500 },
    ];
    const 줄 = 목록줄들(이름들, 쌓임, true);
    expect(줄.map((x) => x.상태)).toEqual(['done', 'now', 'wait']);
    expect(줄[0]?.ms).toBe(1500);
    expect(줄[1]?.ms).toBe(4000);
    expect(지금번호(줄)).toBe(2);
  });

  it('안 도는 목록은 기다림 표시를 달지 않는다', () => {
    expect(목록줄들(이름들, [], false)[0]?.기다림).toBeUndefined();
  });
});

describe('경과글', () => {
  it('분과 초로 적는다', () => {
    expect(경과글(21_400)).toBe('0:21');
    expect(경과글(65_000)).toBe('1:05');
    expect(경과글(-5)).toBe('0:00');
  });
});
