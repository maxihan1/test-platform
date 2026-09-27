import { describe, expect, it } from 'vitest';

import type { AuthoringProgress, AuthoringRow } from './api.js';
import { 다시작성되나, 단계자리, 목록글, 시간판, 진척, 짧은수 } from './authoringStatus.js';

const 기준 = Date.parse('2026-09-28T13:20:00Z');

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 1,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'RUNNING',
    stage: null,
    stageAt: null,
    requestedByName: '테스터',
    claimedBy: 'author',
    prUrl: null,
    error: null,
    createdAt: '2026-09-28T13:19:00Z',
    startedAt: '2026-09-28T13:20:00Z',
    finishedAt: null,
    ...덮을것,
  };
}

const 도는진척: AuthoringProgress = { childRunning: true, elapsedSec: 600, limitSec: 3600, caseFiles: 3, tokens: 10 };

describe('단계자리', () => {
  it('대기 중이면 아무 단계도 시작하지 않았다', () => {
    expect(단계자리(줄({ status: 'PENDING', startedAt: null }))).toEqual({ 끝난: 0, 지금: null, 멈춤: null });
  });

  it('에이전트가 올리는 단계 글을 다섯 칸의 자리로 바꾼다', () => {
    expect(단계자리(줄({ stage: '작업방을 만드는 중' }))?.지금).toBe(0);
    expect(단계자리(줄({ stage: '자료를 받는 중' }))?.지금).toBe(1);
    expect(단계자리(줄({ stage: '케이스를 만드는 중' }))?.지금).toBe(2);
    expect(단계자리(줄({ stage: '올리는 중' }))?.지금).toBe(3);
    expect(단계자리(줄({ stage: '원본에 차이를 표시하는 중' }))?.지금).toBe(3);
  });

  it('모르는 단계 글이면 진척이 있을 때 케이스 작성, 없으면 준비로 본다', () => {
    expect(단계자리(줄({ stage: '새로 생긴 단계', progress: 도는진척 }))?.지금).toBe(2);
    expect(단계자리(줄({ stage: null }))?.지금).toBe(0);
  });

  it('완료면 다섯 칸이 다 끝났다', () => {
    expect(단계자리(줄({ status: 'DONE', stage: '끝' }))).toEqual({ 끝난: 5, 지금: null, 멈춤: null });
  });

  it('중단·실패는 멈춘 자리를 남긴다', () => {
    expect(단계자리(줄({ status: 'STOPPED', stage: '케이스를 만드는 중' }))).toEqual({ 끝난: 2, 지금: 2, 멈춤: 'stopped' });
    expect(단계자리(줄({ status: 'FAILED', stage: '자료를 받는 중' }))).toEqual({ 끝난: 1, 지금: 1, 멈춤: 'failed' });
  });

  it('머지 요청은 단계 막대가 없다', () => {
    expect(단계자리(줄({ kind: 'MERGE', stage: 'CI 기다리는 중' }))).toBeNull();
  });
});

describe('진척', () => {
  it('도는 중이면 지금 단계까지 센다', () => {
    expect(진척({ 끝난: 2, 지금: 2, 멈춤: null })).toEqual({ 번호: 3, 비율: 0.6 });
  });

  it('완료는 5/5, 대기는 0/5', () => {
    expect(진척({ 끝난: 5, 지금: null, 멈춤: null })).toEqual({ 번호: 5, 비율: 1 });
    expect(진척({ 끝난: 0, 지금: null, 멈춤: null })).toEqual({ 번호: 0, 비율: 0 });
  });

  it('멈춘 것은 끝낸 단계만큼만 채운다', () => {
    expect(진척({ 끝난: 2, 지금: 2, 멈춤: 'stopped' })).toEqual({ 번호: 3, 비율: 0.4 });
  });
});

describe('시간판', () => {
  it('대기 중이면 시작 시각이 없다', () => {
    expect(시간판(줄({ status: 'PENDING', startedAt: null }), 기준)).toEqual({ 시작: null, 끝: null, 걸린ms: null, 한도: null });
  });

  it('케이스 작성 중이면 한도 막대와 늦어도 끝나는 시각을 낸다', () => {
    const 판 = 시간판(줄({ stageAt: '2026-09-28T13:30:00Z', progress: 도는진척 }), Date.parse('2026-09-28T13:30:30Z'));
    expect(판.한도?.늦어도.toISOString()).toBe('2026-09-28T14:20:00.000Z');
    expect(판.한도?.지난ms).toBe(630_000);
    expect(판.한도?.한도ms).toBe(3_600_000);
    expect(판.한도?.비율).toBeCloseTo(0.175);
  });

  it('한도를 넘어도 막대는 가득에서 멈춘다', () => {
    const 판 = 시간판(줄({ stageAt: '2026-09-28T13:30:00Z', progress: { ...도는진척, elapsedSec: 3700 } }), Date.parse('2026-09-28T13:30:00Z'));
    expect(판.한도?.비율).toBe(1);
  });

  it('자식이 끝났거나 진척 칸이 덜 찼으면 한도를 내지 않는다', () => {
    expect(시간판(줄({ progress: { ...도는진척, childRunning: false } }), 기준).한도).toBeNull();
    expect(시간판(줄({ progress: { childRunning: true } as AuthoringProgress }), 기준).한도).toBeNull();
  });

  it('끝난 요청은 끝난 시각과 걸린 시간을 낸다', () => {
    const 판 = 시간판(줄({ status: 'DONE', finishedAt: '2026-09-28T13:24:33Z', progress: 도는진척 }), 기준 + 999_999);
    expect(판.끝?.toISOString()).toBe('2026-09-28T13:24:33.000Z');
    expect(판.걸린ms).toBe(273_000);
    expect(판.한도).toBeNull();
  });

  it('도는 중이면 걸린 시간은 지금까지다', () => {
    expect(시간판(줄({}), 기준 + 60_000).걸린ms).toBe(60_000);
  });
});

describe('짧은수', () => {
  it('큰 수는 줄여 쓴다', () => {
    expect(짧은수(1_234_567)).toBe('1.2M');
    expect(짧은수(124)).toBe('124');
  });
});

describe('목록글', () => {
  it('상태마다 사람이 읽는 한 문장을 낸다', () => {
    expect(목록글(줄({ status: 'PENDING', startedAt: null }), 'ko')).toBe('에이전트가 집어 가기를 기다리는 중');
    expect(목록글(줄({ status: 'DRAFT', startedAt: null }), 'ko')).toBe('자료를 올리는 중');
    expect(목록글(줄({ stage: '케이스를 만드는 중' }), 'ko')).toBe('케이스를 만드는 중');
    expect(목록글(줄({ stage: null }), 'ko')).toBe('준비');
  });

  it('끝난 것은 결과를 말한다 — 날것 단계 글(끝)을 보이지 않는다', () => {
    expect(목록글(줄({ status: 'DONE', stage: '끝', progress: 도는진척 }), 'ko')).toBe('케이스 파일 3개를 만들었습니다');
    expect(목록글(줄({ status: 'DONE', stage: '끝' }), 'ko')).toBe('테스트 코드를 PR 로 올렸습니다');
    expect(목록글(줄({ status: 'DONE', kind: 'MERGE', stage: '끝' }), 'ko')).toBe('테스트 반영 완료');
    expect(목록글(줄({ status: 'STOPPED', stage: '케이스를 만드는 중' }), 'ko')).toBe('케이스 작성 단계에서 멈췄습니다');
    expect(목록글(줄({ status: 'FAILED', error: '자료를 못 받았다\n자세히' }), 'ko')).toBe('자료를 못 받았다');
  });
});

describe('다시작성되나', () => {
  it('정방향 작성이 실패·중단이면 된다', () => {
    expect(다시작성되나(줄({ status: 'FAILED' }))).toBe(true);
    expect(다시작성되나(줄({ status: 'STOPPED' }))).toBe(true);
  });

  it('대조 요청 · 머지 · 재실행 · 폐기한 것 · 끝나지 않은 것은 안 된다', () => {
    expect(다시작성되나(줄({ status: 'FAILED', compare: true }))).toBe(false);
    expect(다시작성되나(줄({ status: 'FAILED', kind: 'MERGE' }))).toBe(false);
    expect(다시작성되나(줄({ status: 'FAILED', kind: 'RERUN' }))).toBe(false);
    expect(다시작성되나(줄({ status: 'FAILED', discardedAt: '2026-09-28T13:00:00Z' }))).toBe(false);
    expect(다시작성되나(줄({ status: 'RUNNING' }))).toBe(false);
    expect(다시작성되나(줄({ status: 'DONE' }))).toBe(false);
  });
});
