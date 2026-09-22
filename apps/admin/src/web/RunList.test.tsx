// @vitest-environment jsdom
// 실행 기록 목록 검사 (SPEC §8.7, 2026-09-22 신설).
//
// **이 화면에는 그물이 없었다.** 검사 파일 없이 화면을 통째로 다시 그리면 회귀를 못 잡으므로,
// 지금 지키고 있는 것 셋을 먼저 박는다 — ① 빈 목록 문장이 「이 서비스에서」로 갈린다
// ② 총건수를 페이지 계산에 안 쓴다 ③ 색만으로 판정을 전달하지 않는다.
// 그 위에 새로 생긴 것(머리 · 집계 띠 · 검색 · 거르개)을 얹는다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type Paged, type RunSummary, type RunTally } from './api.js';
import { RunList } from './RunList.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 실행(runId: number, fail: number): RunSummary {
  return {
    runId,
    title: `ZRL 실행 ${runId}`,
    triggeredBy: 'zrl',
    triggeredByName: '김검사',
    env: 'qa',
    baseUrl: 'https://qa.example.com',
    serviceName: 'ZRL 서비스',
    status: 'FINISHED',
    startedAt: '2026-09-22T00:00:00.000Z',
    finishedAt: '2026-09-22T00:10:00.000Z',
    counts: { total: 3, pass: 3 - fail, fail, na: 0, running: 0 },
  };
}

const 집계: RunTally = {
  runs: 42,
  allPass: 31,
  hasFail: 9,
  durationOf: 41,
  avgDurationMs: 684000,
  maxDurationMs: 2880000,
};

// 한 쪽 크기를 2 로 두면 2건짜리 쪽은 「더 있다」다 (paging.ts)
const 한쪽: Paged<RunSummary> & { summary: RunTally } = {
  items: [실행(2113, 1), 실행(2112, 0)],
  total: 42,
  page: 1,
  pageSize: 2,
  summary: 집계,
};

const 빈쪽 = (summary: RunTally): Paged<RunSummary> & { summary: RunTally } => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 2,
  summary,
});

const 빈집계: RunTally = { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 };

function 모킹(답: Paged<RunSummary> & { summary: RunTally } = 한쪽) {
  return vi.spyOn(api, 'runs').mockResolvedValue(답);
}

async function 그리기(답?: Paged<RunSummary> & { summary: RunTally }) {
  const 스파이 = 모킹(답);
  const 것 = render(<RunList service="ZRL" role="admin" />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  return { ...것, 스파이 };
}

describe('RunList 화면 머리', () => {
  it('제목이 h1 이고 본문 면 바깥에 선다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    const 머리 = container.querySelector('.head');
    expect(머리?.querySelector('h1')?.textContent).toBe('실행 기록');
    expect(container.querySelector('.screen .head')).toBeNull();
  });

  it('머리에 증적 버튼을 두지 않는다', async () => {
    await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    // 증적은 실행 하나마다 만든다 (§8.4). 목록에서 무엇을 받는지가 명세에 없어 확정 목업의
    // 그 버튼을 뺐다 — 누르면 아무 일도 안 하는 버튼을 만들지 않는다 (2026-09-22 결정)
    expect(screen.queryByRole('button', { name: /증적/ })).toBeNull();
  });
});

describe('RunList 집계 띠', () => {
  it('넷을 숫자와 글자 라벨로 같이 낸다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    const 글 = container.querySelector('.stats')?.textContent ?? '';
    for (const 라벨 of ['실행 횟수', '성공', '실패', '평균 소요']) expect(글).toContain(라벨);
    expect(글).toContain('42');
    expect(글).toContain('31');
  });

  it('평균 소요가 몇 회를 센 것인지 적는다', async () => {
    await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    // 도는 실행은 소요가 없어 평균에서 빠진다. 안 적으면 42회의 평균으로 읽힌다
    expect(screen.getByText(/끝난 41회/)).toBeTruthy();
  });

  it('판정이 아닌 칸에는 판정 색을 안 칠한다', async () => {
    const { container } = await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    const 칸들 = [...container.querySelectorAll('.stat')];
    expect(칸들[0]?.className).toBe('stat');
    expect(칸들.at(-1)?.className).toBe('stat');
  });
});

describe('RunList 거르개', () => {
  it('검색어를 넣으면 서버에 실어 보낸다 — 화면이 거르지 않는다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    fireEvent.change(screen.getByPlaceholderText(/실행 제목/), { target: { value: '결제' } });
    fireEvent.submit(screen.getByRole('search'));

    // 목록이 쪽으로 나뉘어 오므로 받은 쪽만 거르면 뒤쪽이 조용히 빠진다 (SPEC §8.7)
    await waitFor(() => {
      expect(스파이).toHaveBeenCalledWith('ZRL', 1, expect.objectContaining({ q: '결제' }));
    });
  });

  it('상태 거르개를 누르면 같이 실린다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    fireEvent.click(screen.getByRole('button', { name: '실패' }));

    await waitFor(() => {
      expect(스파이).toHaveBeenCalledWith('ZRL', 1, expect.objectContaining({ state: 'failed' }));
    });
  });
});

describe('RunList 빈 목록', () => {
  it('한 번도 안 돌린 사람에게는 서비스를 짚어 말한다', async () => {
    await 그리기(빈쪽(빈집계));

    expect(await screen.findByText(/이 서비스에서 아직 실행한 기록이 없습니다/)).toBeTruthy();
  });

  it('거르개에 안 걸린 사람에게는 다른 문장을 준다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    스파이.mockResolvedValue(빈쪽(집계));
    fireEvent.change(screen.getByPlaceholderText(/실행 제목/), { target: { value: '없을리없는것' } });
    fireEvent.submit(screen.getByRole('search'));

    // 검색한 사람에게 「아직 실행한 기록이 없습니다」는 틀린 문장이다 (SPEC §8.1 과 같은 함정)
    expect(await screen.findByText(/조건에 맞는 실행이 없습니다/)).toBeTruthy();
  });
});

describe('RunList 지킬 것', () => {
  it('총건수로 페이지 수를 계산하지 않는다', async () => {
    // total 42 · pageSize 2 · items 2 → 「다음」이 살아 있고, 총건수는 안내로만 쓴다
    await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    expect(screen.getByRole('button', { name: '다음' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/21쪽/)).toBeNull();
  });

  it('판정을 색만으로 전달하지 않는다', async () => {
    await 그리기();
    await screen.findByText(/ZRL 실행 2113/);

    // 줄마다 통과·실패·미실행이 글자로 적힌다. 왼쪽 색 띠는 훑기 위한 것이다 (SPEC §8.7)
    expect(screen.getAllByText('통과').length).toBeGreaterThan(0);
    expect(screen.getAllByText('실패').length).toBeGreaterThan(0);
  });
});

// 화면을 갈아타면 돌아올 때 검색 조건이 풀리고 보던 자리를 잃는다 (SPEC §8.7, 2026-09-22).
// 「상자가 뜬다」만 보면 **상자 안에서 또 상자가 뜨는 상태**도 통과한다 — 가두개가 겹치면
// 키보드만 쓰는 사람이 빠져나올 길을 잃는다 (DESIGN.md 「모달」)
describe('결과 보기는 상자로 연다 (SPEC §8.7)', () => {
  it('칸마다 이름이 있다. 좁은 화면에서도 감추지 않는 자리다', async () => {
    await 그리기();
    const 이름들 = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(이름들).toEqual(['RUN', '실행 제목', '판정']);
  });

  it('누르면 상자가 뜨고 화면이 안 갈아탄다', async () => {
    const 전주소 = window.location.hash;
    await 그리기();

    fireEvent.click(screen.getAllByRole('button', { name: '결과 보기' })[0]!);

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(window.location.hash).toBe(전주소);
  });

  it('상자가 하나뿐이다. 안에서 또 열리면 빠져나올 길이 없다', async () => {
    await 그리기();
    fireEvent.click(screen.getAllByRole('button', { name: '결과 보기' })[0]!);
    await screen.findByRole('dialog');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('닫으면 검색 조건이 그대로 남는다', async () => {
    await 그리기();

    fireEvent.change(screen.getByPlaceholderText(/실행 제목/), { target: { value: '결제' } });
    fireEvent.submit(screen.getByRole('search'));
    fireEvent.click(screen.getAllByRole('button', { name: '결과 보기' })[0]!);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect((screen.getByPlaceholderText(/실행 제목/) as HTMLInputElement).value).toBe('결제');
  });
});
