// 실행명 · 「무엇을」 줄이기 · 시작 시각 글 검사 (도메인/실행 §8.7 「실행명」)

import { describe, expect, it } from 'vitest';

import { 무엇을, 시작글, 시작방식글, 실행명 } from './runName.js';

// 자리표를 채우는 가짜 t — 「{수}건」의 수가 들어가는지 본다
const 그대로 = (키: string, 값: Record<string, string | number> = {}) => 키.replace(/§.*$/, '').replace(/\{(.+?)\}/g, (_, 칸: string) => String(값[칸]));
const 지금 = new Date(2026, 10, 24, 9, 0);
// 시간대에 안 매이게 지역 시각으로 만든다
const 때 = (해: number, 월: number, 일: number, 시: number, 분: number) => new Date(해, 월 - 1, 일, 시, 분).toISOString();

type 재료 = Parameters<typeof 무엇을>[0];
const 런 = (title: string, origin: 재료['origin'], kind: 재료['kind'] = 'FN'): 재료 => ({ title, origin, kind });

describe('무엇을 — 서버 자동제목이 짓는 꼴마다 종류와 건수를 남긴다', () => {
  it('직접 실행 — 「<번호> 외 N건」은 종류를 앞에 붙인 건수로', () => {
    expect(무엇을(런('MTA-FN-168 외 19건', 'MANUAL', 'FN'), 그대로)).toBe('기능 테스트 20건');
    expect(무엇을(런('MTA-UI-168 외 19건', 'MANUAL', 'UI'), 그대로)).toBe('UI 테스트 20건');
    expect(무엇을(런('MKT-FN-001 외 1건', 'MANUAL', 'FN'), 그대로)).toBe('기능 테스트 2건');
  });

  it('종류를 모르는 줄(옛 응답)은 기능 테스트로 읽는다', () => {
    expect(무엇을({ title: 'MKT-FN-001 외 1건', origin: 'MANUAL' }, 그대로)).toBe('기능 테스트 2건');
  });

  it('전체 — 「기능 전체 N건」 · 「UI 전체 N건」은 「테스트」를 붙여 읽힌다', () => {
    expect(무엇을(런('기능 전체 208건', 'MANUAL'), 그대로)).toBe('기능 테스트 전체 208건');
    expect(무엇을(런('UI 전체 5건', 'MANUAL', 'UI'), 그대로)).toBe('UI 테스트 전체 5건');
  });

  it('정기 실행 — 「정기 · 」를 걷고 세트 이름이 앞에 서면 그 이름이 주어라 종류를 안 붙인다', () => {
    expect(무엇을(런('정기 · 결제 회귀 · MKT-FN-033 외 3건', 'SCHEDULED'), 그대로)).toBe('결제 회귀 · 4건');
    expect(무엇을(런('정기 · 결제 회귀 · 기능 전체 382건', 'SCHEDULED'), 그대로)).toBe('결제 회귀 · 기능 테스트 전체 382건');
    expect(무엇을(런('정기 · MKT-FN-033 외 3건', 'SCHEDULED'), 그대로)).toBe('기능 테스트 4건');
  });

  it('빌드 실행 — 「빌드 N · 」를 걷고 스모크는 「스모크 N건」으로 붙인다', () => {
    expect(무엇을(런('빌드 124 · 스모크 · MTA-FN-265 외 11건', 'BUILD'), 그대로)).toBe('스모크 12건');
    expect(무엇을(런('빌드 124 · MTA-FN-265 외 11건', 'BUILD'), 그대로)).toBe('기능 테스트 12건');
  });

  it('Fail 다시 실행 — 「RUN N의 M건」', () => {
    expect(무엇을(런('RUN 20914의 Fail 7건 다시', 'RERUN'), 그대로)).toBe('RUN 20914의 7건');
  });

  it('케이스 하나 · 프로시저 하나 제목은 그대로 둔다', () => {
    expect(무엇을(런('MKT-FN-014 결제 완료', 'MANUAL'), 그대로)).toBe('MKT-FN-014 결제 완료');
    expect(무엇을(런('MKT-FN-014 결제 완료', 'SINGLE'), 그대로)).toBe('MKT-FN-014 결제 완료');
    expect(무엇을(런('PRC-001 로그인 프로시저', 'SINGLE'), 그대로)).toBe('PRC-001 로그인 프로시저');
  });

  it('모르는 꼴은 그대로 둔다 — 시작 방식이 맞지 않는 접두어도 건드리지 않는다', () => {
    expect(무엇을(런('아무 제목', 'MANUAL'), 그대로)).toBe('아무 제목');
    expect(무엇을(런('정기 · 결제 회귀', 'MANUAL'), 그대로)).toBe('정기 · 결제 회귀');
    expect(무엇을(런('RUN 20914의 Fail 7건 다시', 'MANUAL'), 그대로)).toBe('RUN 20914의 Fail 7건 다시');
    expect(무엇을(런('빌드 124 · 아무 제목', 'BUILD'), 그대로)).toBe('아무 제목');
  });
});

describe('시작방식글', () => {
  it('한 건 실행도 사람이 건 실행이라 「직접 실행」이고 모르는 값은 직접 실행으로 본다', () => {
    expect(시작방식글('MANUAL', 그대로)).toBe('직접 실행');
    expect(시작방식글('SINGLE', 그대로)).toBe('직접 실행');
    expect(시작방식글(undefined, 그대로)).toBe('직접 실행');
    expect(시작방식글('SCHEDULED', 그대로)).toBe('정기 실행');
    expect(시작방식글('RERUN', 그대로)).toBe('Fail 다시 실행');
    expect(시작방식글('BUILD', 그대로)).toBe('빌드 실행');
  });
});

describe('시작글', () => {
  it('올해면 해를 안 적는다', () => {
    expect(시작글(때(2026, 11, 23, 14, 2), 'ko', 지금)).toBe('11월 23일 14:02');
  });

  it('다른 해면 해를 적는다 — 해를 넘긴 실행이 올해 것으로 읽히지 않게', () => {
    const 글 = 시작글(때(2025, 12, 31, 23, 5), 'ko', 지금);
    expect(글).toContain('2025');
    expect(글).toContain('12월 31일');
    expect(글).toContain('23:05');
  });

  it('영어는 월 이름을 줄여 적는다', () => {
    expect(시작글(때(2026, 11, 23, 14, 2), 'en', 지금)).toContain('Nov 23');
  });
});

describe('실행명 — 언제 · 어떻게 · 무엇을', () => {
  const 올해 = new Date().getFullYear();

  it('시작 시각 · 시작 방식 · 무엇을 순서로 가운뎃점으로 잇는다', () => {
    const run = { title: 'MTA-FN-168 외 19건', origin: 'MANUAL' as const, kind: 'FN' as const, startedAt: 때(올해, 11, 23, 14, 2) };
    expect(실행명(run, 'ko', 그대로)).toBe('11월 23일 14:02 · 직접 실행 · 기능 테스트 20건');
  });

  it('정기 실행은 세트 이름이 무엇을 자리에 남는다', () => {
    const run = { title: '정기 · 결제 회귀 · MKT-FN-033 외 3건', origin: 'SCHEDULED' as const, kind: 'FN' as const, startedAt: 때(올해, 3, 2, 9, 30) };
    expect(실행명(run, 'ko', 그대로)).toBe('3월 2일 09:30 · 정기 실행 · 결제 회귀 · 4건');
  });
});
