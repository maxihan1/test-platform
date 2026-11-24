// @vitest-environment jsdom
// 실행 기록 목록의 표 — 칸 · 꼬리표 · 띠 · 고리 검사 (SPEC §8.7 「목록은 표다」)

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { 실행표머리, 실행표줄 } from './RunListTable.js';
import { 실행 } from './RunList.fixture.js';
import type { RunListRow } from './api.js';

afterEach(cleanup);

function 그리기(run: RunListRow, 목록조건 = '') {
  const { container } = render(<실행표줄 run={run} 목록조건={목록조건} />);
  const 줄 = container.querySelector<HTMLAnchorElement>('a.rt-line')!;
  const 칸 = [...줄.children].map((el) => el.textContent ?? '');
  return { container, 줄, 칸 };
}

describe('실행표머리', () => {
  it('칸 이름이 RUN · 실행 · 시작 방식 · 빌드 · 시작 · 소요 시간 · 통과율 · Pass · Fail · Not tested 다', () => {
    render(<실행표머리 />);
    expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual([
      'RUN', '실행', '시작 방식', '빌드', '시작', '소요 시간', '통과율', 'Pass', 'Fail', 'Not tested',
    ]);
  });
});

describe('실행표줄 칸', () => {
  it('줄 하나가 실행 하나이고 칸이 머리와 같은 차례로 선다', () => {
    const { 칸 } = 그리기(실행(2113, 1, { buildNo: '124', counts: { total: 3, pass: 2, fail: 1, na: 0, running: 0 } }));
    // 띠 · RUN · 실행 · 시작 방식 · 빌드 · 시작 · 소요 시간 · 통과율 · Pass · Fail · Not tested
    expect(칸).toHaveLength(11);
    expect(칸[1]).toBe('2113');
    expect(칸[2]).toBe('ZRL 실행 2113');
    expect(칸[3]).toBe('직접 실행');
    expect(칸[4]).toBe('124');
    expect(칸[6]).toBe('10분');
    expect(칸[7]).toBe('66.7%');
    expect(칸.slice(8)).toEqual(['2', '1', '0']);
  });

  it('빌드 번호가 없으면 줄표다', () => {
    expect(그리기(실행(1, 0)).칸[4]).toBe('—');
    expect(그리기(실행(2, 0, { buildNo: null })).칸[4]).toBe('—');
  });

  it('「실행」 칸은 박제 제목 전체가 아니라 무엇을 돌렸나만 적고 건수 앞에 종류를 붙인다', () => {
    const { container } = 그리기(실행(20914, 0, { title: 'MTA-FN-168 외 19건', kind: 'FN' }));
    expect(container.querySelector('.rt-name')?.textContent).toBe('기능 테스트 20건');
    cleanup();
    const 화면 = 그리기(실행(20913, 0, { title: 'MTA-UI-168 외 19건', kind: 'UI' }));
    expect(화면.container.querySelector('.rt-name')?.textContent).toBe('UI 테스트 20건');
    cleanup();
    const 전체 = 그리기(실행(20912, 0, { title: '기능 전체 208건', kind: 'FN' }));
    expect(전체.container.querySelector('.rt-name')?.textContent).toBe('기능 테스트 전체 208건');
    cleanup();
    const 정기 = 그리기(실행(20915, 0, { origin: 'SCHEDULED', title: '정기 · 결제 회귀 · MKT-FN-033 외 3건' }));
    expect(정기.container.querySelector('.rt-name')?.textContent).toBe('결제 회귀 · 4건');
    expect(정기.칸[3]).toBe('정기 실행');
    cleanup();
    const 다시 = 그리기(실행(20916, 0, { origin: 'RERUN', title: 'RUN 20914의 Fail 7건 다시' }));
    expect(다시.container.querySelector('.rt-name')?.textContent).toBe('RUN 20914의 7건');
    expect(다시.칸[3]).toBe('Fail 다시 실행');
  });

  it('스모크 · 케이스 하나 제목은 종류를 안 붙인다', () => {
    const 이름 = (run: RunListRow) => 그리기(run).container.querySelector('.rt-name')?.textContent;
    expect(이름(실행(3, 0, { origin: 'BUILD', title: '빌드 124 · 스모크 · MTA-FN-265 외 11건' }))).toBe('스모크 12건');
    cleanup();
    expect(이름(실행(4, 0, { title: 'MKT-FN-014 결제 완료' }))).toBe('MKT-FN-014 결제 완료');
  });

  it('시작 칸은 시작 시각이고 결과 화면에서 읽던 실행자 · 대상 서버 · 실행 위치는 줄에 없다', () => {
    const { 줄 } = 그리기(실행(2120, 0, { platforms: ['desktop', 'mobile'], devices: ['SM-S911N'] }));
    for (const 글 of ['김검사', 'qa', 'PC Chrome', '모바일 Safari', 'Device VISION', 'SM-S911N', 'https://qa.example.com']) {
      expect(줄.textContent).not.toContain(글);
    }
  });
});

describe('실행표줄 소요 · 통과율', () => {
  it('끝난 실행은 시작에서 끝까지의 시간과 통과 비율이고 분모에 Not tested 도 든다', () => {
    const { 칸 } = 그리기(
      실행(1, 1, { startedAt: '2026-09-22T00:00:00.000Z', finishedAt: '2026-09-22T00:01:30.000Z', counts: { total: 4, pass: 2, fail: 1, na: 1, running: 0 } }),
    );
    expect(칸[6]).toBe('1분 30초');
    expect(칸[7]).toBe('50.0%');
  });

  it('도는 실행은 소요 시간도 통과율도 줄표다 — 끝나면 달라질 값이다', () => {
    const { 칸 } = 그리기(실행(3, 0, { status: 'RUNNING', finishedAt: null, counts: { total: 3, pass: 1, fail: 0, na: 0, running: 2 } }));
    expect(칸[6]).toBe('—');
    expect(칸[7]).toBe('—');
  });

  it('돈 항목이 하나도 없으면 막대도 비율도 없다', () => {
    const { container, 칸 } = 그리기(실행(4, 0, { counts: { total: 0, pass: 0, fail: 0, na: 0, running: 0 } }));
    expect(칸[7]).toBe('—');
    expect(container.querySelector('.rt-bar')).toBeNull();
  });
});

describe('실행표줄 꼬리표', () => {
  const 꼬리표 = (container: HTMLElement) => container.querySelector('.rt-title')?.textContent ?? '';

  it('끝까지 돈 실행은 상태를 적지 않는다', () => {
    expect(꼬리표(그리기(실행(1, 0)).container)).toBe('ZRL 실행 1');
  });

  it('진행 중 · 중단 · 준비 실패만 상태 꼬리표로 선다', () => {
    expect(꼬리표(그리기(실행(1, 0, { status: 'RUNNING', finishedAt: null })).container)).toBe('ZRL 실행 1진행 중');
    cleanup();
    expect(꼬리표(그리기(실행(2, 0, { status: 'ABORTED' })).container)).toBe('ZRL 실행 2중단');
    cleanup();
    expect(꼬리표(그리기(실행(3, 0, { status: 'PREP_FAILED' })).container)).toBe('ZRL 실행 3준비 실패');
  });

  it('회귀 실패 N 은 새로 깨진 것이 있을 때만 서고 0 이거나 change 가 null 이면 없다', () => {
    const 있음 = 그리기(실행(1, 3, { change: { newFail: 2, stillFail: 1 } }));
    expect(있음.container.querySelector('.rt-reg')?.textContent).toBe('회귀 실패 2');
    cleanup();
    expect(그리기(실행(2, 0, { change: { newFail: 0, stillFail: 0 } })).container.querySelector('.rt-reg')).toBeNull();
    cleanup();
    expect(그리기(실행(3, 0, { change: null })).container.querySelector('.rt-reg')).toBeNull();
  });

  it('미확정 N건은 있을 때만 서고 없으면 쓰지 않는다', () => {
    const 있음 = 그리기(실행(1, 2, { counts: { total: 3, pass: 1, fail: 2, na: 0, running: 0, unconfirmed: 2 } }));
    expect(꼬리표(있음.container)).toContain('미확정 2건');
    cleanup();
    expect(꼬리표(그리기(실행(2, 0)).container)).not.toContain('미확정');
  });

  it('기존 실패 · 해결 · 자동 수정은 줄에 없다 — 결과 화면이 말한다', () => {
    const { 줄 } = 그리기(실행(1, 3, { change: { newFail: 2, stillFail: 1, fixed: 3 }, autoFixed: 1 }));
    for (const 글 of ['기존 실패', '해결', '자동 수정']) expect(줄.textContent).not.toContain(글);
  });
});

describe('실행표줄 판정 칸', () => {
  it('Fail 이 있는 줄만 fail 띠 클래스가 붙는다', () => {
    expect(그리기(실행(1, 1)).줄.classList.contains('fail')).toBe(true);
    cleanup();
    expect(그리기(실행(2, 0)).줄.classList.contains('fail')).toBe(false);
    cleanup();
    expect(그리기(실행(3, 0, { status: 'ABORTED', counts: { total: 3, pass: 0, fail: 0, na: 3, running: 0 } })).줄.classList.contains('fail')).toBe(false);
  });

  it('Blocked 가 있으면 Not tested 칸에 「3 (Blocked 2)」 꼴이고 0 이면 괄호가 없다', () => {
    const 막힘 = 그리기(실행(1, 0, { counts: { total: 5, pass: 2, fail: 0, na: 3, running: 0, blocked: 2 } }));
    expect(막힘.칸[10]).toBe('3 (Blocked 2)');
    cleanup();
    const 없음 = 그리기(실행(2, 0, { counts: { total: 5, pass: 2, fail: 0, na: 3, running: 0, blocked: 0 } }));
    expect(없음.칸[10]).toBe('3');
    cleanup();
    expect(그리기(실행(3, 0, { counts: { total: 3, pass: 3, fail: 0, na: 0, running: 0 } })).칸[10]).toBe('0');
  });

  it('디바이스별 Fail 수로 나누지 않는다 — Fail 칸은 숫자 하나다', () => {
    const { 칸 } = 그리기(실행(20932, 10, { counts: { total: 606, pass: 595, fail: 10, na: 1, running: 0 }, failCases: { desktop: 4, mobile: 6 } }));
    expect(칸.slice(8)).toEqual(['595', '10', '1']);
  });

  it('판정을 색만으로 전달하지 않는다 — 머리가 Pass · Fail · Not tested 글자로 이름 붙인다', () => {
    render(<실행표머리 />);
    for (const 글 of ['Pass', 'Fail', 'Not tested']) expect(screen.getByRole('columnheader', { name: 글 })).toBeTruthy();
  });
});

describe('실행표줄 고리', () => {
  it('줄 전체가 그 실행의 결과 화면 고리다', () => {
    const { 줄 } = 그리기(실행(2113, 1));
    expect(줄.tagName).toBe('A');
    expect(줄.getAttribute('href')).toBe('#/runs/2113');
  });

  it('목록에 건 조건이 list= 로 실려 결과 화면이 그 조건으로 돌아갈 수 있다', () => {
    const { 줄 } = 그리기(실행(2113, 1), 'state=failed&service=ZRL');
    expect(줄.getAttribute('href')).toBe('#/runs/2113?list=state%3Dfailed%26service%3DZRL');
  });

  it('줄에는 고른 줄 표시(aria-current)가 없다 — 목록에서는 줄을 고르지 않는다', () => {
    expect(그리기(실행(2113, 1)).줄.hasAttribute('aria-current')).toBe(false);
  });
});
