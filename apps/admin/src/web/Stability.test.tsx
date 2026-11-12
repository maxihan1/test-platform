// @vitest-environment jsdom
// 안정화 지표 메인 화면 검사 (도메인/안정화 §8.19 · 시안 6판)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { ServiceRow } from './api.js';
import { Stability } from './Stability.js';
import { stabilityApi, type 안정화응답 } from './stabilityApi.js';

const 앱: ServiceRow = {
  id: 7,
  prefix: 'MTW',
  name: '마스토돈 웹',
  color: '#667788',
  projectId: 10,
  projectName: '시연',
  envs: [],
  hasSlackWebhook: false,
  kind: 'SCREEN',
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 응답 = (덮: Partial<안정화응답> = {}): 안정화응답 => ({
  schedule: { at: '03:00', tz: 'Asia/Seoul' },
  runs: [
    { runId: 3044, day: '2026-11-12' },
    { runId: 3040, day: '2026-11-11' },
  ],
  run: {
    runId: 3044,
    runIds: [3043, 3044],
    day: '2026-11-12',
    env: 'qa',
    buildNo: '22',
    cases: 128,
    errorCases: 9,
    passErrorCases: 7,
    crashes: null,
    residual: 2,
    newErrors: 1,
    resolved: 2,
    confirmed: 1,
    previous: { runId: 3040, day: '2026-11-11', errorCases: 4, residual: 1, crashes: null },
  },
  summary: {
    status: 'DONE',
    headline: '빌드 #22 적용 후 신규 오류 1종',
    changes: [{ errorId: 5, state: 'NEW', text: 'TypeError — 홈 진입 직후' }],
    features: [
      { name: '홈', errorCases: 7 },
      { name: '상점', errorCases: 0 },
    ],
    verified: '11-10 해결 처리 1종 — 이후 오류 없음',
    trend: '잔여 오류 1~2종 유지',
    finishedAt: '2026-11-12T03:42:00Z',
  },
  trend: [
    { day: '2026-11-11', runId: 3040, residual: 1, newErrors: 1, buildNo: '21', buildChanged: false },
    { day: '2026-11-12', runId: 3044, residual: 2, newErrors: 1, buildNo: '22', buildChanged: true },
  ],
  errors: [
    { id: 5, title: 'TypeError · Cannot read properties of undefined', state: 'NEW', cases: 4, previousCases: 0, firstDay: '2026-11-12', firstBuildNo: '22', tcIds: ['MTW-FN-112', 'MTW-FN-113', 'MTW-FN-114', 'MTW-FN-115'] },
    { id: 6, title: 'HTTP 500 · GET /api/v1/timelines/home', state: 'ONGOING', cases: 2, previousCases: 2, firstDay: '2026-11-06', firstBuildNo: null, tcIds: ['MTW-FN-207', 'MTW-FN-208'] },
  ],
  ...덮,
});

afterEach(() => {
  cleanup();
  window.location.hash = '';
  vi.restoreAllMocks();
});

async function 그리기(답: 안정화응답 = 응답(), run?: number) {
  const 부르기 = vi.spyOn(stabilityApi, 'main').mockResolvedValue(답);
  render(<Stability service={앱} run={run} />);
  await screen.findByRole('heading', { name: /안정화 지표/ });
  await waitFor(() => expect(부르기).toHaveBeenCalled());
  return 부르기;
}

describe('안정화 지표 메인', () => {
  it('머리는 정기 실행 시각 · 날짜 · 묶음의 두 실행 링크 · 케이스 수 · 빌드다', async () => {
    const 부르기 = await 그리기();
    expect(부르기).toHaveBeenCalledWith(7, null, 7);
    expect(await screen.findByRole('link', { name: '#3043' })).toHaveProperty('hash', '#/runs/3043');
    expect(screen.getByRole('link', { name: '#3044' })).toHaveProperty('hash', '#/runs/3044');
    expect(document.querySelector('.head-meta')?.textContent).toBe('정기 실행 · 매일 03:00 · 11-12 실행 #3043 · #3044 · 케이스 128건 · 빌드 #22');
  });

  it('AI 실행 요약 — 한 줄 결론 · 상태 칩 · 기능 막대 · 판정과의 차이는 그 실행 결과로 간다', async () => {
    await 그리기();
    const 판 = (await screen.findByRole('heading', { name: 'AI 실행 요약' })).closest('section')!;
    expect(within(판).getByText('빌드 #22 적용 후 신규 오류 1종')).toBeTruthy();
    expect(within(판).getByText('신규')).toBeTruthy();
    expect(within(판).getByText('7건')).toBeTruthy();
    expect(within(판).getByRole('link', { name: '케이스 보기' })).toHaveProperty('hash', '#/runs/3044');
    expect(within(판).getByText(/^AI 작성 · \d\d-\d\d \d\d:\d\d · 최근 7일 기준$/)).toBeTruthy();
  });

  it('요약을 쓰는 중이면 판에 그 한 줄만 서고 숫자 · 목록은 그대로다', async () => {
    const 요약 = { status: 'RUNNING' as const, headline: null, changes: null, features: null, verified: null, trend: null, finishedAt: null };
    await 그리기(응답({ summary: 요약 }));
    expect(await screen.findByText('AI 요약 작성 중')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '오류 목록' })).toBeTruthy();
    expect(screen.queryByText('판정과의 차이')).toBeNull();
  });

  it('웹은 크래시 칸 없이 숫자 셋이고, 앱은 넷이다', async () => {
    await 그리기();
    const 추이 = (await screen.findByRole('heading', { name: '잔여 오류 추이' })).closest('section')!;
    expect(within(추이).queryByText('크래시')).toBeNull();
    expect(within(추이).getByText('이전 실행 4건')).toBeTruthy();
    expect(within(추이).getByText('해결 확인 1종')).toBeTruthy();
    cleanup();
    await 그리기(응답({ run: { ...응답().run!, crashes: 2, previous: { ...응답().run!.previous!, crashes: 0 } } }));
    const 앱추이 = (await screen.findByRole('heading', { name: '잔여 오류 추이' })).closest('section')!;
    expect(within(앱추이).getByText('크래시')).toBeTruthy();
    expect(within(앱추이).getByText('2회')).toBeTruthy();
  });

  it('오류 목록 — 이름은 그 실행의 상세 링크, 발생 케이스는 외 N건 · 둘이면 한 번만', async () => {
    await 그리기();
    const 링크 = await screen.findByRole('link', { name: 'TypeError · Cannot read properties of undefined' });
    expect(링크).toHaveProperty('hash', '#/stability/errors/5?run=3044');
    expect(screen.getByText('MTW-FN-112 외 3건')).toBeTruthy();
    expect(screen.getByText('MTW-FN-207 · 208')).toBeTruthy();
    expect(screen.getByText('11-12 · #22')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '11-12' })).toBeTruthy();
  });

  it('날짜를 고르면 그 실행을 다시 읽고 주소에 남긴다 · 30일을 누르면 창을 넓힌다', async () => {
    window.location.hash = '#/stability';
    const 부르기 = await 그리기();
    fireEvent.change(await screen.findByRole('combobox', { name: '실행 날짜' }), { target: { value: '3040' } });
    await waitFor(() => expect(부르기).toHaveBeenLastCalledWith(7, 3040, 7));
    expect(window.location.hash).toBe('#/stability?run=3040');
    fireEvent.click(screen.getByRole('button', { name: '30일' }));
    await waitFor(() => expect(부르기).toHaveBeenLastCalledWith(7, 3040, 30));
  });

  it('주소의 실행으로 처음부터 연다', async () => {
    const 부르기 = await 그리기(응답(), 3040);
    expect(부르기).toHaveBeenCalledWith(7, 3040, 7);
  });

  it('집계 줄이 없으면 빈 화면 안내, 오류가 없는 실행은 목록에 한 줄', async () => {
    await 그리기(응답({ runs: [], run: null, summary: null, trend: [], errors: [] }));
    expect(await screen.findByText('정기 실행 기록이 없습니다')).toBeTruthy();
    expect(screen.getByText('설정에서 정기 실행을 켜면 매일 집계합니다')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    cleanup();
    await 그리기(응답({ errors: [] }));
    expect(await screen.findByText('이 실행에는 오류가 없습니다')).toBeTruthy();
  });
});
