// @vitest-environment jsdom
// 실행 기록 목록 검사 (SPEC §8.7 「목록 화면과 결과 화면을 따로」). 줄 하나의 모양은 RunListTable.test.tsx 가 본다.
//
// 지키는 것 — ① 빈 목록 문장이 「이 애플리케이션에서」로 갈린다 ② 총건수를 페이지 계산에 안 쓴다
// ③ 거르는 일은 서버가 한다 ④ 거르개 · 쪽 · 애플리케이션이 주소에 남는다 ⑤ 옛 주소(실행을 고른 좌우 칸)는 결과 화면으로 옮긴다
// ⑥ 도는 실행이 보이는 동안 3초마다 다시 받는다 ⑦ 목록은 결과를 그리지 않는다

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type EnvRow } from './api.js';
import { RunList } from './RunList.js';
import { 빈쪽, 실행, 한쪽, 줄들 } from './RunList.fixture.js';

const 서버들: EnvRow[] = [
  { env: 'qa', baseUrl: 'https://qa.example.com' },
  { env: 'stage', baseUrl: 'https://stage.example.com' },
];

beforeEach(() => {
  window.location.hash = '#/runs/fn';
  vi.spyOn(api, 'run').mockReturnValue(new Promise(() => {}));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function 그리기(답 = 한쪽, kind: 'UI' | 'FN' = 'FN') {
  const 스파이 = vi.spyOn(api, 'runs').mockResolvedValue(답);
  const 것 = render(<RunList kind={kind} service="ZRL" envs={서버들} />);
  await waitFor(() => expect(스파이).toHaveBeenCalled());
  return { ...것, 스파이 };
}

describe('RunList 머리', () => {
  it('제목이 h1 이고 본문 면 바깥에 선다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(container.querySelector('.head h1')?.textContent).toBe('실행 기록 › 기능 테스트');
    expect(container.querySelector('.screen .head')).toBeNull();
  });

  it('고른 종류로 부르고 제목에 「실행 기록 › 종류」로 위치를 적는다', async () => {
    const { 스파이, container } = await 그리기(한쪽, 'UI');
    expect(스파이).toHaveBeenCalledWith('ZRL', 1, { kind: 'UI' });
    await screen.findByText('ZRL 실행 2113');
    expect(screen.getByRole('heading', { level: 1, name: '실행 기록 › UI 테스트' })).toBeTruthy();
    expect(container.querySelector('.head-meta')?.textContent).toBe('모두 42건');
  });

  it('머리 집계 띠가 없다 — 평균 소요는 판단에 안 쓰였다 (점검 1.5)', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(container.querySelector('.stats')).toBeNull();
    expect(screen.queryByText('평균 소요')).toBeNull();
  });
});

describe('RunList 목록만 그린다', () => {
  it('결과 칸이 없다 — 실행을 열지 않고 실행 하나도 부르지 않는다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(api.run).not.toHaveBeenCalled();
    expect(container.querySelector('.runs-split')).toBeNull();
    expect(screen.queryByRole('button', { name: '목록으로' })).toBeNull();
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('줄을 누르는 것은 고리다 — 주소만 있고 목록은 그 자리에 남는다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(줄들(container).map((el) => el.getAttribute('href'))).toEqual(['#/runs/2113?list=service%3DZRL', '#/runs/2112?list=service%3DZRL']);
    expect(window.location.hash).toBe('#/runs/fn?service=ZRL');
  });
});

describe('RunList 거르개 — 거르는 일은 서버가 한다', () => {
  it('검색어를 서버에 실어 보낸다 — 케이스 번호 · 이름에도 맞는다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    fireEvent.change(screen.getByLabelText('케이스 · 제목으로 검색'), { target: { value: 'ZRL-FN-007' } });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, expect.objectContaining({ q: 'ZRL-FN-007' })));
  });

  it('상태 · 대상 서버 · 시작 방식 · 기간을 고르면 같이 실리고 주소에 남는다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'failed' } });
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'stage' } });
    fireEvent.change(screen.getByLabelText('시작 방식'), { target: { value: 'rerun' } });
    fireEvent.change(screen.getByLabelText('기간'), { target: { value: '14' } });

    await waitFor(() =>
      expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, { kind: 'FN', state: 'failed', env: 'stage', origin: 'rerun', days: 14 }),
    );
    expect(window.location.hash).toBe('#/runs/fn?state=failed&env=stage&origin=rerun&days=14&service=ZRL');
    expect(document.querySelector('.head')?.textContent).toMatch(/최근 14일 42건/);
  });

  it('시작 방식 「빌드 실행」은 서버에 origin=build 로 거른다 (도메인/실행 §8.7)', async () => {
    const { 스파이 } = await 그리기();
    fireEvent.change(screen.getByLabelText('시작 방식'), { target: { value: 'build' } });
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, { kind: 'FN', origin: 'build' }));
    expect(window.location.hash).toBe('#/runs/fn?origin=build&service=ZRL');
  });

  it('줄의 고리가 건 조건을 list 로 싣는다 — 결과 화면의 「← 실행 기록」 · 「이전 · 다음 실행」이 같은 조건을 쓴다', async () => {
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'failed' } });
    await waitFor(() => expect(줄들(container)[0]?.getAttribute('href')).toBe('#/runs/2113?list=state%3Dfailed%26service%3DZRL'));
    expect(줄들(container)[1]?.getAttribute('href')).toBe('#/runs/2112?list=state%3Dfailed%26service%3DZRL');
  });

  it('쪽은 list 에 싣지 않는다 — 옆 실행으로 넘어가면 그 실행이 그 쪽에 없다', async () => {
    window.location.hash = '#/runs/fn?state=failed&page=2&service=ZRL';
    const { container } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(줄들(container)[0]?.getAttribute('href')).toBe('#/runs/2113?list=state%3Dfailed%26service%3DZRL');
  });

  it('애플리케이션을 바꾸면 건 조건을 버린다 — 남기면 다른 애플리케이션에서 「없다」만 보여준다', async () => {
    window.location.hash = '#/runs/fn?state=failed&env=stage&page=2&service=ZRL';
    const 스파이 = vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    const { rerender } = render(<RunList kind="FN" service="ZRL" envs={서버들} />);
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 2, { kind: 'FN', state: 'failed', env: 'stage' }));

    rerender(<RunList kind="FN" service="MKT" envs={서버들} />);

    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('MKT', 1, { kind: 'FN' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?service=MKT'));
  });
});

describe('RunList 주소', () => {
  it('거르개 · 쪽 · 애플리케이션이 담긴 주소로 연다 — 받은 링크 · 새로고침 · 뒤로 가기에 풀리지 않는다 (점검 2.9)', async () => {
    window.location.hash = '#/runs/fn?state=failed&page=2&service=ZRL';
    const { 스파이 } = await 그리기();

    expect(스파이).toHaveBeenCalledWith('ZRL', 2, { kind: 'FN', state: 'failed' });
    await screen.findByText('ZRL 실행 2113');
    expect(window.location.hash).toBe('#/runs/fn?state=failed&page=2&service=ZRL');
  });

  it('다음 쪽으로 가면 쪽이 주소에 남고 첫 쪽은 적지 않는다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 2, { kind: 'FN' }));
    expect(window.location.hash).toBe('#/runs/fn?page=2&service=ZRL');

    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/fn?service=ZRL'));
  });

  it('실행을 고른 옛 주소(좌우 칸)는 그 실행의 결과 화면 주소로 옮기고 목록을 그리지 않는다 — 붙여 둔 고리가 썩지 않게', async () => {
    window.location.hash = '#/runs/fn?run=130&state=failed&tc=ZRL-FN-001';
    const 스파이 = vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    const { container } = render(<RunList kind="FN" service="ZRL" envs={서버들} />);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/130?tc=ZRL-FN-001&list=state%3Dfailed'));
    expect(스파이).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });

  it('고른 실행이 조건만 있는 옛 주소는 결과 화면 주소에 list 만 단다', async () => {
    window.location.hash = '#/runs/fn?run=2112';
    vi.spyOn(api, 'runs').mockResolvedValue(한쪽);
    render(<RunList kind="FN" service="ZRL" envs={서버들} />);

    await waitFor(() => expect(window.location.hash).toBe('#/runs/2112'));
  });
});

describe('RunList 빈 목록', () => {
  it('한 번도 안 돌린 사람에게는 애플리케이션을 짚어 말하고 케이스 목록으로 가는 길을 준다', async () => {
    await 그리기(빈쪽);
    expect(await screen.findByText(/이 애플리케이션에서 아직 실행한 기록이 없습니다/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '케이스 목록으로' }).getAttribute('href')).toBe('#/cases/fn');
  });

  it('거르개에 안 걸린 사람에게는 다른 문장과 「조건 초기화」를 준다', async () => {
    const { 스파이 } = await 그리기();
    await screen.findByText('ZRL 실행 2113');

    스파이.mockResolvedValue(빈쪽);
    fireEvent.change(screen.getByLabelText('시작 방식'), { target: { value: 'scheduled' } });

    expect(await screen.findByText(/조건에 맞는 실행이 없습니다/)).toBeTruthy();
    expect(screen.queryByText(/이 애플리케이션에서 아직/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
    await waitFor(() => expect(스파이).toHaveBeenLastCalledWith('ZRL', 1, { kind: 'FN' }));
  });

  it('줄이 없으면 칸 이름 줄도 없다', async () => {
    await 그리기(빈쪽);
    await screen.findByText(/이 애플리케이션에서 아직 실행한 기록이 없습니다/);
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
  });
});

describe('RunList 지킬 것', () => {
  it('총건수로 페이지 수를 계산하지 않는다', async () => {
    // total 42 · pageSize 2 · items 2 → 「다음」이 살아 있고, 총건수는 안내로만 쓴다
    await 그리기();
    await screen.findByText('ZRL 실행 2113');

    expect(screen.getByRole('button', { name: '다음' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(/21쪽/)).toBeNull();
  });

  it('도는 실행이 있으면 3초마다 목록을 다시 받아 줄의 숫자 · 상태를 바꾼다. 다 끝나면 그친다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 도는 = 실행(20925, 0, { status: 'RUNNING', finishedAt: null, counts: { total: 249, pass: 79, fail: 0, na: 0, running: 1 } });
    const { container, 스파이 } = await 그리기({ ...한쪽, items: [도는] });
    await screen.findByText('ZRL 실행 20925');
    스파이.mockResolvedValue({ ...한쪽, items: [{ ...도는, status: 'FINISHED', finishedAt: '2026-09-22T00:50:00.000Z', counts: { total: 249, pass: 247, fail: 2, na: 0, running: 0 } }] });

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    await waitFor(() => expect(줄들(container)[0]?.textContent).toContain('247'));
    expect(줄들(container)[0]?.textContent).not.toContain('진행 중');
    const 끝난뒤 = 스파이.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(스파이.mock.calls.length).toBe(끝난뒤);
  });

  it('다시 받기는 보이는 줄만 덮는다 — 실패해도 목록이 오류 화면으로 안 바뀌고, 위에 새 실행이 서도 줄이 그대로다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const 도는 = 실행(20925, 0, { status: 'RUNNING', finishedAt: null });
    const { container, 스파이 } = await 그리기({ ...한쪽, items: [도는] });
    await screen.findByText('ZRL 실행 20925');
    스파이.mockRejectedValue(new Error('502'));
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(줄들(container).map((el) => el.textContent?.includes('ZRL 실행 20925'))).toEqual([true]);

    스파이.mockResolvedValue({ ...한쪽, items: [실행(20929, 0, { status: 'RUNNING', finishedAt: null }), 도는] });
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(줄들(container)).toHaveLength(1);
    expect(screen.queryByText('ZRL 실행 20929')).toBeNull();
  });
});
