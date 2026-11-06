import { describe, expect, it } from 'vitest';

import type { TrialResult } from './api.js';
import { 걸린글, 결과단계줄들, 대기열알약, 도는단계줄들, 째글 } from './trialView.js';
import type { 디바이스칸, 쌓인단계 } from './useTrialQueue.js';

const 단계 = (seq: number, title: string, 시작: number, elapsedMs = 0): 쌓인단계 => ({ seq, title, 시작, elapsedMs });

describe('도는 단계 줄', () => {
  it('제목을 알면 처음부터 다 세우고 끝난 단계는 걸린 시간, 지금 단계는 경과, 남은 단계는 기다림이다', () => {
    const 줄들 = 도는단계줄들([단계(1, '로그인한다', 1_000), 단계(2, '담는다', 3_100, 1_500)], ['로그인한다', '담는다', '결제한다']);

    expect(줄들).toEqual([
      { seq: 1, title: '로그인한다', 상태: 'done', ms: 2_100 },
      { seq: 2, title: '담는다', 상태: 'now', ms: 1_500 },
      { seq: 3, title: '결제한다', 상태: 'wait' },
    ]);
  });

  it('아직 첫 단계를 못 받았으면 제목만 모두 기다림으로 선다', () => {
    expect(도는단계줄들([], ['로그인한다', '담는다']).map((줄) => 줄.상태)).toEqual(['wait', 'wait']);
  });

  it('묻는 사이 지나간 단계는 끝났지만 시간을 모른다 — 빠진 단계의 시간을 앞 단계에 섞지 않는다', () => {
    const 줄들 = 도는단계줄들([단계(1, '로그인한다', 1_000), 단계(3, '결제한다', 5_000)], ['로그인한다', '담는다', '결제한다']);

    expect(줄들.slice(0, 2)).toEqual([
      { seq: 1, title: '로그인한다', 상태: 'done' },
      { seq: 2, title: '담는다', 상태: 'done' },
    ]);
  });

  it('제목을 모르면 받은 단계만 한 줄씩 늘어난다', () => {
    const 줄들 = 도는단계줄들([단계(1, '로그인한다', 1_000), 단계(2, '담는다', 2_000, 300)], null);

    expect(줄들.map((줄) => [줄.title, 줄.상태])).toEqual([['로그인한다', 'done'], ['담는다', 'now']]);
  });
});

describe('결과 단계 줄', () => {
  const 실패: TrialResult = {
    status: 'FAIL',
    durationMs: 1_800,
    steps: [
      { seq: 1, title: '로그인한다', status: 'PASS', durationMs: 100, assertions: [] },
      { seq: 2, title: '담는다', status: 'FAIL', durationMs: 50, assertions: [] },
    ],
  };

  it('실패한 뒤 결과에 없는 남은 단계는 「실행 안 함」(null) 으로 붙인다', () => {
    expect(결과단계줄들(실패, ['로그인한다', '담는다', '결제한다']).map((줄) => [줄.seq, 줄.status])).toEqual([
      [1, 'PASS'],
      [2, 'FAIL'],
      [3, null],
    ]);
  });

  it('결과 단계가 저장된 제목과 다르거나 제목이 없으면 남은 단계를 지어내지 않는다', () => {
    expect(결과단계줄들(실패, ['로그인한다', '다른 단계', '결제한다'])).toHaveLength(2);
    expect(결과단계줄들(실패, null)).toHaveLength(2);
  });
});

describe('대기열 알약', () => {
  const 끝 = (status: 'PASS' | 'FAIL' | 'NA'): 디바이스칸 => ({ platform: 'desktop', 줄: { 종류: 'done', 결과: { status, durationMs: 1, steps: [] } } });

  it('도는 칸이 있으면 진행 중, 실패가 있으면 실패 수, 다 기다리면 대기 수, 다 통과면 통과 수다', () => {
    expect(대기열알약([끝('PASS'), { platform: 'mobile', 줄: { 종류: 'run' } }])).toEqual({ 종류: 'run', 수: 1 });
    expect(대기열알약([끝('PASS'), 끝('FAIL')])).toEqual({ 종류: 'fail', 수: 1 });
    expect(대기열알약([{ platform: 'desktop', 줄: { 종류: 'wait' } }, { platform: 'mobile', 줄: { 종류: 'wait' } }])).toEqual({ 종류: 'wait', 수: 2 });
    expect(대기열알약([끝('PASS'), 끝('PASS')])).toEqual({ 종류: 'pass', 수: 2 });
  });

  it('중단 · 미실행 · 안내가 섞이면 통과 아닌 칸을 미실행으로 센다', () => {
    expect(대기열알약([끝('PASS'), 끝('NA'), { platform: 'android', 줄: { 종류: 'skip' } }])).toEqual({ 종류: 'na', 수: 2 });
  });
});

describe('시간 글자', () => {
  it('초 단위로 반올림하고 1분이 넘으면 분 · 초다. 반올림해 0 이면 1초 미만이다', () => {
    expect(걸린글(2_720, 'ko')).toBe('3초');
    expect(걸린글(62_000, 'ko')).toBe('1분 2초');
    expect(걸린글(300, 'ko')).toBe('1초 미만');
  });

  it('지금 단계는 몇째 초인지 적는다', () => {
    expect(째글(300, 'ko')).toBe('1초째');
    expect(째글(1_900, 'ko')).toBe('2초째');
    expect(째글(62_500, 'ko')).toBe('1분 3초째');
  });
});
