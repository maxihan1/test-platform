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
  it('작성 중이면 지금 단계 · 한도 막대 · 숫자 칸을 보인다 — 토큰 · 에이전트 기록 줄 · 「N단계 · %」는 없다 (⑫ 점검 12.8 · 12.9 · 12.16)', () => {
    render(<AuthoringStatusCard 요청={줄({})} 지금={지금} />);
    expect(screen.getByText('작성 중')).toBeTruthy();
    const 단계 = screen.getByRole('list', { name: '단계' });
    expect(within(단계).getByText('케이스 작성').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.queryByText(/단계 진행 중/)).toBeNull();
    expect(screen.getByText(/12분 지남 \/ 한도 60분/)).toBeTruthy();
    expect(screen.getByText(/늦어도/)).toBeTruthy();
    expect(screen.getByText('3개')).toBeTruthy();
    expect(screen.getByText('9장')).toBeTruthy();
    expect(screen.queryByText('1.2M')).toBeNull();
    expect(screen.queryByText('화면 캡처')).toBeNull();
    expect(screen.getByText('케이스를 만드는 중')).toBeTruthy();
  });

  it('대기 중이면 에이전트를 기다린다고 말하고 시간 줄이 없다', () => {
    render(<AuthoringStatusCard 요청={줄({ status: 'PENDING', stage: null, startedAt: null, progress: null })} 지금={지금} />);
    expect(screen.getByText('대기 중')).toBeTruthy();
    expect(screen.getByText('작성 순서를 기다리는 중')).toBeTruthy();
    expect(screen.queryByRole('progressbar', { name: '시간' })).toBeNull();
  });

  it('평소 걸린 시간을 알면 남은 시간 · 종료 예상 · 기준 건수를 지난 시간 뒤에 붙인다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: null, expected: { ms: 18 * 60_000, samples: 8 } })} 지금={지금} />);
    expect(screen.getByText(/^12분 지남 · 약 6분 남음 · \d{2}:\d{2} 종료 예상 · 최근 8건 기준$/)).toBeTruthy();
  });

  it('평소보다 오래 걸리면 얼마나 넘었는지를 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: null, expected: { ms: 10 * 60_000, samples: 3 } })} 지금={지금} />);
    expect(screen.getByText('12분 지남 · 평소보다 2분 더 걸리고 있습니다')).toBeTruthy();
  });

  it('평소 시간을 모르면(null) 지금처럼 지난 시간과 시작 시각만 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: null, expected: null })} 지금={지금} />);
    expect(screen.getByText(/12분 지남 · 시작/)).toBeTruthy();
    expect(screen.queryByText(/남음/)).toBeNull();
  });

  it('자식 전이면 한도 없이 지난 시간과 시작 시각만, 지금 하는 일은 단계 글이다', () => {
    render(<AuthoringStatusCard 요청={줄({ stage: '자료를 받는 중', progress: null })} 지금={지금} />);
    expect(screen.getByText(/12분 지남 · 시작/)).toBeTruthy();
    expect(screen.getByText('지금 하는 일')).toBeTruthy();
    expect(screen.getByText('자료 · PRD 를 읽는 중')).toBeTruthy();
  });

  it('작성이 끝나면 PR 까지 끝나고 반영 칸에서 기다린다 — 칩은 초록 완료가 아니라 반영 대기다 (⑫ 점검 12.1 · 11.2)', () => {
    render(
      <AuthoringStatusCard
        요청={줄({ status: 'DONE', stage: '끝', finishedAt: '2026-09-28T13:24:33Z', progress: { childRunning: false, elapsedSec: 200, limitSec: 3600, caseFiles: 4, tokens: 900_000 } })}
        지금={지금}
      />,
    );
    expect(screen.getByText('반영 대기').closest('.status-chip')?.className).not.toContain('done');
    const 단계 = screen.getByRole('list', { name: '단계' });
    expect(within(단계).getByText('저장 · PR 생성').closest('li')?.className).toBe('done');
    expect(within(단계).getByText('반영').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText(/4분 33초 걸림/)).toBeTruthy();
    expect(screen.getByText('4개')).toBeTruthy();
  });

  it('반영이 실패했으면 반영 칸에서 멈추고 칩이 반영 실패다 — 목록과 같은 말 (⑫ 점검 N2)', () => {
    render(<AuthoringStatusCard 요청={줄({ status: 'DONE', stage: '끝', progress: null })} 최신={{ kind: 'MERGE', status: 'FAILED' }} 지금={지금} />);
    expect(screen.getByText('반영 실패').closest('.status-chip')?.className).toContain('fail');
    expect(within(screen.getByRole('list', { name: '단계' })).getByText('반영').closest('li')?.className).toBe('fail');
  });

  it('반영까지 끝나면 케이스 등록까지 다 끝났고 칩이 반영 완료다', () => {
    render(<AuthoringStatusCard 요청={줄({ kind: 'MERGE', status: 'DONE', stage: null, progress: null, finishedAt: '2026-09-28T13:30:00Z' })} 지금={지금} />);
    expect(screen.getByText('반영 완료').closest('.status-chip')?.className).toContain('done');
    expect(within(screen.getByRole('list', { name: '단계' })).getByText('케이스 등록').closest('li')?.className).toBe('done');
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

  it('실패면 까닭을 카드 안에 보인다 — 옮길 수 없는 글은 그대로', () => {
    render(<AuthoringStatusCard 요청={줄({ status: 'FAILED', stage: '자료를 받는 중', error: '자료를 못 받았다', finishedAt: '2026-09-28T13:21:00Z', progress: null })} 지금={지금} />);
    expect(screen.getByText('실패')).toBeTruthy();
    expect(screen.getByText('자료를 못 받았다')).toBeTruthy();
    expect(screen.queryByText('원문 보기')).toBeNull();
  });

  it('에이전트의 반말 실패 글은 사람 말로 옮기고 원문은 접어 둔다 (⑫ 점검 12.7)', () => {
    const 원문 = '대상 서버 「qa」 에 테스트 계정이 빠졌다 — 설정 > 애플리케이션에서 넣고 새 요청으로 넣어라';
    render(<AuthoringStatusCard 요청={줄({ status: 'FAILED', error: 원문, progress: null })} 지금={지금} />);
    expect(screen.getByText('대상 서버 「qa」에 테스트 계정이 없습니다. 관리자에게 테스트 계정을 넣어 달라고 요청하세요')).toBeTruthy();
    expect(screen.getByText('원문 보기')).toBeTruthy();
    expect(screen.getByText(원문).closest('details')).not.toBeNull();
  });

  it('도는 반영은 반영 칸이 지금 칸이고 지금 하는 일을 적는다', () => {
    render(<AuthoringStatusCard 요청={줄({ kind: 'MERGE', stage: 'CI 기다리는 중', progress: null })} 지금={지금} />);
    expect(within(screen.getByRole('list', { name: '단계' })).getByText('반영').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('반영 중')).toBeTruthy();
    expect(screen.getByText('CI 기다리는 중')).toBeTruthy();
  });

  it('케이스 고치기는 단계 막대가 없다', () => {
    render(<AuthoringStatusCard 요청={줄({ kind: 'MERGE', stage: 'CI 기다리는 중', progress: null })} 뿌리종류="EDIT" 지금={지금} />);
    expect(screen.queryByRole('list', { name: '단계' })).toBeNull();
  });

  it('칸이 덜 찬 진척이어도 죽지 않는다', () => {
    render(<AuthoringStatusCard 요청={줄({ progress: { childRunning: false } as AuthoringRow['progress'] })} 지금={지금} />);
    expect(screen.getByText('작성 중')).toBeTruthy();
  });
});
