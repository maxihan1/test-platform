// @vitest-environment jsdom
// 안정화 지표 오류 상세 화면 검사 (도메인/안정화 §8.19 「상세」 · 시안 6판 Detail6)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError } from './api.js';
import { StabilityDetail } from './StabilityDetail.js';
import { stabilityApi, type 오류상세 } from './stabilityApi.js';

const 상세 = (덮: Partial<오류상세> = {}): 오류상세 => ({
  id: 5,
  title: 'NullReferenceException · ClientCharacter.OnAnimEvent',
  message: 'Object reference not set to an instance of an object',
  source: 'GAME_EXCEPTION',
  state: 'NEW',
  runId: 3044,
  firstRunId: 3044,
  firstDay: '2026-11-12',
  firstBuildNo: '22',
  resolvedAt: null,
  confirmedRunId: null,
  issue: null,
  btsLinked: true,
  ai: { headline: '빌드 #22 에서 처음 발생', impact: '1건 크래시로 실패', previous: '11-11 · 빌드 #21 오류 없음', cause: '제거된 캐릭터의 애니메이션 이벤트 호출', runId: 3044 },
  kpis: { cases: 2, runCases: 128, passCases: 1, crashCases: 1, firstCrashTcId: 'ARG-FN-112', hits: 11, previousHits: 0 },
  occurrences: [
    { tcId: 'ARG-FN-031', name: '임프를 처치하면 경험치가 오른다', status: 'PASS', seq: 2, crash: false, historyId: 1, runId: 3044 },
    { tcId: 'ARG-FN-112', name: '던전 입장 후 바닥을 눌러 이동한다', status: 'FAIL', seq: 3, crash: true, historyId: 2, runId: 3044 },
  ],
  samples: [
    { text: 'NullReferenceException: 첫째', page: null, device: 'Galaxy S23 · Android 14', runId: 3044, tcId: 'ARG-FN-112', at: '2026-11-12T03:10:00Z' },
    { text: 'NullReferenceException: 둘째', page: null, device: 'Galaxy S23 · Android 14', runId: 3044, tcId: 'ARG-FN-031', at: '2026-11-12T03:11:00Z' },
  ],
  trend: [
    { day: '2026-11-11', cases: 0 },
    { day: '2026-11-12', cases: 2 },
  ],
  devices: [{ name: 'Galaxy S23', os: 'Android 14', cases: 2 }],
  ...덮,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function 그리기(답: 오류상세 = 상세(), 쓰나 = true, run: number | undefined = 3044) {
  const 부르기 = vi.spyOn(stabilityApi, 'error').mockResolvedValue(답);
  render(<StabilityDetail id={5} run={run} 쓰나={쓰나} />);
  await screen.findByRole('heading', { level: 1 });
  return 부르기;
}

describe('안정화 지표 오류 상세', () => {
  it('위치 줄은 그 실행의 메인으로 돌아가고, 머리는 상태 칩 · 최초 발생 · 정기 실행 링크 · 이름 · 메시지다', async () => {
    const 부르기 = await 그리기();
    expect(부르기).toHaveBeenCalledWith(5, 3044);
    expect(screen.getByRole('link', { name: '안정화 지표' })).toHaveProperty('hash', '#/stability?run=3044');
    expect(screen.getByText('신규')).toBeTruthy();
    expect(screen.getByRole('link', { name: '정기 실행 #3044' })).toHaveProperty('hash', '#/runs/3044');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('NullReferenceException · ClientCharacter.OnAnimEvent');
    expect(screen.getByText('Object reference not set to an instance of an object')).toBeTruthy();
  });

  it('AI 요약 판 — 결론 · 영향 · 이전 실행 · 원인 추정 아래 「코드 미확인」, 없으면 판이 없다', async () => {
    await 그리기();
    const 판 = screen.getByRole('heading', { name: 'AI 요약' }).closest('section')!;
    expect(within(판).getByText('빌드 #22 에서 처음 발생')).toBeTruthy();
    expect(within(판).getByText('코드 미확인')).toBeTruthy();
    expect(within(판).getByText('AI 작성')).toBeTruthy();
    cleanup();
    await 그리기(상세({ ai: { ...상세().ai!, runId: 3040 } }));
    expect(screen.getByText('AI 작성 · 실행 #3040 기준')).toBeTruthy();
    cleanup();
    await 그리기(상세({ ai: null }));
    expect(screen.queryByRole('heading', { name: 'AI 요약' })).toBeNull();
  });

  it('숫자 넷 — 게임은 크래시 연결 칸이 있고 웹은 셋이다', async () => {
    await 그리기();
    expect(screen.getByText('128건 중')).toBeTruthy();
    expect(screen.getByText('크래시 연결')).toBeTruthy();
    expect(screen.getByText('11회')).toBeTruthy();
    expect(screen.getByText('이전 실행 0회')).toBeTruthy();
    cleanup();
    await 그리기(상세({ source: 'WEB_PAGEERROR', devices: [] }));
    expect(screen.queryByText('크래시 연결')).toBeNull();
    expect(screen.queryByRole('heading', { name: '디바이스' })).toBeNull();
  });

  it('발생 케이스 — 판정 칩 · 케이스 링크 · 단계 · 크래시', async () => {
    await 그리기();
    const 판 = screen.getByRole('heading', { name: '발생 케이스 · 단계' }).closest('section')!;
    expect(within(판).getByRole('link', { name: 'ARG-FN-112' }).getAttribute('href')).toContain('#/cases/fn?q=ARG-FN-112');
    expect(within(판).getByText('3단계 직후 · 크래시 발생')).toBeTruthy();
    expect(within(판).getByText('2단계 직후')).toBeTruthy();
    expect(within(판).getByText('실패')).toBeTruthy();
    expect(within(판).getByText('통과')).toBeTruthy();
  });

  it('스택 트레이스는 견본을 1 / 2 로 넘긴다', async () => {
    await 그리기();
    expect(screen.getByText('NullReferenceException: 첫째')).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다음 견본' }));
    expect(screen.getByText('NullReferenceException: 둘째')).toBeTruthy();
    expect(screen.getByText('ARG-FN-031 · Galaxy S23 · Android 14')).toBeTruthy();
  });

  it('해결 처리를 누르면 보내고 다시 읽는다 · 처리한 종류는 버튼 대신 글이다', async () => {
    const 부르기 = await 그리기();
    const 보내기 = vi.spyOn(stabilityApi, 'resolve').mockResolvedValue(undefined);
    부르기.mockResolvedValue(상세({ resolvedAt: '2026-11-12T05:00:00Z' }));
    fireEvent.click(screen.getByRole('button', { name: '해결 처리' }));
    await waitFor(() => expect(screen.getByText(/^해결 · 11-12 처리$/)).toBeTruthy());
    expect(보내기).toHaveBeenCalledWith(5);
    expect(screen.queryByRole('button', { name: '해결 처리' })).toBeNull();
  });

  it('Issue Bunker 등록 — 이미 올렸으면(409) 알리지 않고 다시 읽어 키 링크를 보인다', async () => {
    const 부르기 = await 그리기();
    vi.spyOn(stabilityApi, 'issue').mockRejectedValue(new ApiError(409, 'ALREADY_REGISTERED', ''));
    부르기.mockResolvedValue(상세({ issue: { key: 'ARG-12', url: 'https://bunker.example/issues/ARG-12' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Issue Bunker 등록' }));
    expect(await screen.findByRole('link', { name: 'ARG-12 ↗' })).toHaveProperty('href', 'https://bunker.example/issues/ARG-12');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('등록 중 · 포기 까닭, 읽기 권한이면 버튼이 없고 Issue Bunker 를 안 이었으면 등록 버튼이 없다', async () => {
    await 그리기(상세({ issue: { state: 'PENDING' } }));
    expect(screen.getByText('등록 중')).toBeTruthy();
    cleanup();
    await 그리기(상세({ issue: { state: 'GAVE_UP', reason: '권한 없음 (403)' } }));
    expect(screen.getByText('Issue Bunker 등록 실패 · 권한 없음 (403)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Issue Bunker 등록' })).toBeTruthy();
    cleanup();
    await 그리기(상세(), false);
    expect(screen.queryByRole('button', { name: '해결 처리' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Issue Bunker 등록' })).toBeNull();
    cleanup();
    await 그리기(상세({ btsLinked: false }));
    expect(screen.queryByRole('button', { name: 'Issue Bunker 등록' })).toBeNull();
    expect(screen.getByRole('button', { name: '해결 처리' })).toBeTruthy();
  });
});
