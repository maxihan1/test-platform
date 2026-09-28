// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { AuthoringRow } from './api.js';
import { AuthoringStatusCard } from './AuthoringStatusCard.js';

const 지금 = Date.parse('2026-09-28T13:32:00Z');

function 줄(덮을것: Partial<AuthoringRow>): AuthoringRow {
  return {
    id: 5872,
    kind: 'AUTHOR',
    sourceId: null,
    status: 'RUNNING',
    stage: '케이스를 만드는 중',
    stageAt: '2026-09-28T13:32:00Z',
    requestedByName: '테스터',
    claimedBy: 'author',
    prUrl: null,
    error: null,
    createdAt: '2026-09-28T13:19:00Z',
    startedAt: '2026-09-28T13:20:00Z',
    finishedAt: null,
    progress: {
      childRunning: true,
      elapsedSec: 720,
      limitSec: 3600,
      caseFiles: 3,
      tokens: 1_234_567,
      screens: 9,
      lastAction: '· 화면 캡처',
      lastActionAt: '2026-09-28T13:31:40Z',
    },
    ...덮을것,
  };
}

afterEach(cleanup);

describe('작성 Status 카드', () => {
  it('작성 중이면 지금 단계 · 진척 · 한도 막대 · 숫자 칸 · 방금 한 일을 보인다', () => {
    render(<AuthoringStatusCard 요청={줄({})} 지금={지금} />);
    expect(screen.getByText('작성 중')).toBeTruthy();
    const 단계 = screen.getByRole('list', { name: '단계' });
    expect(within(단계).getByText('케이스 작성').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('3단계 진행 중 · 40%')).toBeTruthy();
    expect(screen.getByText(/12분 지남 \/ 한도 60분/)).toBeTruthy();
    expect(screen.getByText(/늦어도/)).toBeTruthy();
    expect(screen.getByText('3개')).toBeTruthy();
    expect(screen.getByText('9장')).toBeTruthy();
    expect(screen.getByText('1.2M')).toBeTruthy();
    expect(screen.getByText('토큰 (캐시 읽기 포함 · 지금까지)')).toBeTruthy();
    expect(screen.getByText('화면 캡처')).toBeTruthy();
    expect(screen.getByText('20초 전')).toBeTruthy();
  });

  it('진척 막대는 비율을 aria 값으로 가진다', () => {
    render(<AuthoringStatusCard 요청={줄({})} 지금={지금} />);
    const 막대 = screen.getByRole('progressbar', { name: '진척' });
    expect(막대.getAttribute('aria-valuenow')).toBe('40');
  });

  it('대기 중이면 에이전트를 기다린다고 말하고 시간 줄이 없다', () => {
    render(<AuthoringStatusCard 요청={줄({ status: 'PENDING', stage: null, startedAt: null, progress: null })} 지금={지금} />);
    expect(screen.getByText('대기 중')).toBeTruthy();
    expect(screen.getByText('에이전트 순서를 기다리는 중')).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: '시간' })).toBeNull();
  });

  it('자식 전이면 한도 없이 지난 시간과 시작 시각만, 지금 하는 일은 단계 글이다', () => {
    render(<AuthoringStatusCard 요청={줄({ stage: '자료를 받는 중', progress: null })} 지금={지금} />);
    expect(screen.getByText(/12분 지남 · 시작/)).toBeTruthy();
    expect(screen.getByText('지금 하는 일')).toBeTruthy();
    expect(screen.getByText('자료를 받는 중')).toBeTruthy();
  });

  it('완료면 다섯 칸이 다 끝나고 걸린 시간을 보인다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ status: 'DONE', stage: '끝', finishedAt: '2026-09-28T13:24:33Z', progress: { childRunning: false, elapsedSec: 200, limitSec: 3600, caseFiles: 4, tokens: 900_000 } })}
        지금={지금}
      />,
    );
    expect(screen.getAllByText('완료').length).toBeGreaterThan(0);
    expect(screen.getByText('5 / 5 단계 · 100%')).toBeTruthy();
    expect(screen.getByText(/4분 33초 걸림/)).toBeTruthy();
    expect(screen.getByText('4개')).toBeTruthy();
    expect(screen.getByText('토큰 (캐시 읽기 포함)')).toBeTruthy();
  });

  it('중단이면 누가 왜 멈췄는지 카드 안에 적는다', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ status: 'STOPPED', finishedAt: '2026-09-28T14:20:00Z', stoppedBy: 'system', stopReason: 'TIMEOUT' })}
        지금={지금}
      />,
    );
    expect(screen.getByText('중단')).toBeTruthy();
    expect(screen.getByText(/시스템 · 시간초과/)).toBeTruthy();
  });

  it('실패면 까닭을 카드 안에 그대로 보인다', () => {
    render(<AuthoringStatusCard 요청={줄({ status: 'FAILED', stage: '자료를 받는 중', error: '자료를 못 받았다', finishedAt: '2026-09-28T13:21:00Z', progress: null })} 지금={지금} />);
    expect(screen.getByText('실패')).toBeTruthy();
    expect(screen.getByText('자료를 못 받았다')).toBeTruthy();
  });

  it('머지 요청은 단계 막대 없이 상태와 지금 하는 일만 보인다', () => {
    render(<AuthoringStatusCard 요청={줄({ kind: 'MERGE', stage: 'CI 기다리는 중', progress: null })} 지금={지금} />);
    expect(screen.queryByRole('list', { name: '단계' })).toBeNull();
    expect(screen.getByText('CI 기다리는 중')).toBeTruthy();
  });

  it('칸이 덜 찬 진척이어도 죽지 않는다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: { childRunning: false } as AuthoringRow['progress'] })} 지금={지금} />);
    expect(screen.getByText('작성 중')).toBeTruthy();
  });
});
