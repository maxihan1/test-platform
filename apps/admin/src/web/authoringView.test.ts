import { describe, expect, it } from 'vitest';

import type { AuthoringRow } from './api.js';
import { 보임라벨, 멈춘듯기준, 줄보임, 중단이유라벨 } from './authoringView.js';

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
  it('자료를 올리는 중(DRAFT)이면 준비 중이다. 대기라고 하면 기다리면 되는 줄로 읽는다', () => {
    const 보 = 줄보임(줄({ status: 'DRAFT' }), 지금);
    expect(보).toBe('draft');
    expect(보임라벨(보, 'ko')).toBe('준비 중');
  });

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

  it('중단(STOPPED)은 시각과 무관하게 중단이다. 실행 중단과 같은 말을 쓴다', () => {
    const 오래전 = new Date(지금 - 멈춘듯기준 - 1000).toISOString();
    const 보 = 줄보임(줄({ status: 'STOPPED', stageAt: 오래전 }), 지금);
    expect(보).toBe('stopped');
    expect(보임라벨(보, 'ko')).toBe('중단');
    expect(보임라벨(보, 'en')).toBe('Aborted');
  });
});

describe('중단 이유를 사람 말로', () => {
  it('이유 다섯을 각각 사람 말로 낸다', () => {
    expect(중단이유라벨('USER', 'ko')).toBe('사용자가 멈춤');
    expect(중단이유라벨('TIMEOUT', 'ko')).toBe('시간초과');
    expect(중단이유라벨('LIMIT', 'ko')).toBe('구독 한도');
    expect(중단이유라벨('AGENT_RESTART', 'ko')).toBe('에이전트 재시작');
    expect(중단이유라벨('AGENT_LOST', 'ko')).toBe('에이전트 응답 없음');
  });

  it('모르는 값이나 빈 값은 기록 없음이다. 식별자를 화면에 흘리지 않는다', () => {
    expect(중단이유라벨('WHAT', 'ko')).toBe('기록 없음');
    expect(중단이유라벨(null, 'ko')).toBe('기록 없음');
  });
});
