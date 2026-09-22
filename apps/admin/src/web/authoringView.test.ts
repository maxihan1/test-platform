import { describe, expect, it } from 'vitest';

import type { AuthoringRow } from './api.js';
import { 멈춘듯기준, 줄보임 } from './authoringView.js';

const 지금 = new Date('2026-09-22T12:00:00Z').getTime();

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 1,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'PENDING',
    stage: null,
    stageAt: null,
    requestedByName: '테스터',
    claimedBy: null,
    prUrl: null,
    error: null,
    createdAt: '2026-09-22T11:00:00Z',
    startedAt: null,
    finishedAt: null,
    ...덮을것,
  };
}

describe('작성 줄 한 줄을 어떻게 보이나', () => {
  it('아직 아무도 안 집었으면 대기다', () => {
    expect(줄보임(줄({ status: 'PENDING' }), 지금)).toBe('queued');
  });

  it('방금 단계가 바뀌었으면 도는 중이다', () => {
    const 방금 = new Date(지금 - 60 * 1000).toISOString();
    expect(줄보임(줄({ status: 'RUNNING', stage: '케이스 2건째', stageAt: 방금 }), 지금)).toBe('running');
  });

  it('단계가 오래 안 바뀌었으면 멈춘 듯이다. 맥이 죽어도 화면이 도는 중이라고 말하면 안 된다', () => {
    const 오래전 = new Date(지금 - 멈춘듯기준 - 1000).toISOString();
    expect(줄보임(줄({ status: 'RUNNING', stage: '관문 3', stageAt: 오래전 }), 지금)).toBe('stalled');
  });

  it('집어 가고 단계를 한 번도 안 올렸으면 집어 간 시각으로 잰다', () => {
    const 오래전 = new Date(지금 - 멈춘듯기준 - 1000).toISOString();
    expect(줄보임(줄({ status: 'RUNNING', stageAt: null, startedAt: 오래전 }), 지금)).toBe('stalled');
  });

  it('잰 시각이 둘 다 없으면 멈췄다고 단정하지 않는다. 모르는 것을 아는 척하지 않는다', () => {
    expect(줄보임(줄({ status: 'RUNNING', stageAt: null, startedAt: null }), 지금)).toBe('running');
  });

  it('끝난 것과 실패한 것은 시각과 무관하다', () => {
    const 오래전 = new Date(지금 - 멈춘듯기준 - 1000).toISOString();
    expect(줄보임(줄({ status: 'DONE', stageAt: 오래전 }), 지금)).toBe('done');
    expect(줄보임(줄({ status: 'FAILED', stageAt: 오래전 }), 지금)).toBe('failed');
  });
});
