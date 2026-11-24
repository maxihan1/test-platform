// @vitest-environment jsdom
// 실행 결과의 거르개 · 쪽 · 펼친 줄이 주소에 남는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」 · ⑱ WEB-F8-03)

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 실행까지 } from './RunResult.fixture.js';
import { 견줌, 끝난실행, 섞인항목, 첫실행, 칩, 항목줄 } from './RunResultAssemble.fixture.js';
import { 보기읽기, 보기조건, 처음보기, 펼침바꾼보기 } from './runResultView.js';

beforeEach(() => {
  vi.spyOn(api, 'run').mockImplementation((id) => Promise.resolve({ ...끝난실행(섞인항목), runId: id }));
  vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
  vi.spyOn(api, 'runs').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, summary: { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

const 예순 = Array.from({ length: 60 }, (_, i) => 항목줄(i + 1, `K${String(i + 1).padStart(2, '0')}`, 'desktop', 'PASS'));
const 줄수 = () => document.querySelectorAll('.rf-row').length;
const 줄단추 = (tcId: string) => [...document.querySelectorAll('.rf-row')].find((el) => el.querySelector('.rf-id')?.textContent === tcId)!.querySelector('button.rf-line')!;

describe('주소 칸 읽고 쓰기', () => {
  it('쓴 조건을 다시 읽으면 같은 보기다 — 기본값은 적지 않는다', () => {
    const 보기 = { 판정: 'FAIL', device: 'mobile', 변화: '새로깨짐', 쪽: 2, 열린: ['A-FN-001', 'A-FN-002'] } as const;
    const 조건 = new URLSearchParams(보기조건({ ...보기, 열린: [...보기.열린] }));

    expect(보기읽기(조건)).toEqual(보기);
    expect(보기조건(처음보기)).toEqual({});
  });

  it('손으로 고친 모르는 값은 기본값으로 읽는다', () => {
    const 조건 = new URLSearchParams('status=PASSED&device=tv&change=x&rowpage=0&open=');

    expect(보기읽기(조건)).toEqual(처음보기);
  });

  it('카드 목록 때의 옛 칸(cardpage · cause · unjudged · autofix)은 읽지도 쓰지도 않는다', () => {
    const 보기 = 보기읽기(new URLSearchParams('cardpage=3&cause=timeout&unjudged=1&autofix=1&rowpage=2'));

    expect(보기).toEqual({ ...처음보기, 쪽: 2 });
    expect(보기조건(보기)).toEqual({ rowpage: '2' });
  });

  it('대시보드 고리의 tc 는 펼친 카드로 받는다', () => {
    expect(보기읽기(new URLSearchParams('tc=A-FN-009')).열린).toEqual(['A-FN-009']);
    expect(보기읽기(new URLSearchParams('open=A-FN-009&tc=A-FN-009')).열린).toEqual(['A-FN-009']);
  });

  it('같은 카드를 다시 펴면 보기가 그대로다', () => {
    const 편 = 펼침바꾼보기(처음보기, 'A-FN-001', true);

    expect(펼침바꾼보기(편, 'A-FN-001', true)).toBe(편);
    expect(펼침바꾼보기(편, 'A-FN-001', false).열린).toEqual([]);
  });
});

describe('결과 화면 #/runs/번호', () => {
  it('쪽 · 펼친 줄이 주소에 남고 그 주소로 다시 열면 그 쪽의 그 줄이 펼쳐 선다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    vi.mocked(api.run).mockImplementation((id) => Promise.resolve({ ...끝난실행(예순), runId: id }));
    const 읽기 = vi.spyOn(api, 'item').mockRejectedValue(new Error('상세 없음'));
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await waitFor(() => expect(줄수()).toBe(10));
    fireEvent.click(줄단추('K55'));

    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?rowpage=2&open=K55`);

    cleanup();
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(줄수()).toBe(10));
    expect(줄단추('K55').getAttribute('aria-expanded')).toBe('true');
    expect(줄단추('K56').getAttribute('aria-expanded')).toBe('false');
    expect(읽기).toHaveBeenCalledWith(RUN_ID, 55);
  });

  it('쪽을 넘기면 펼친 줄은 주소에서 빠진다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?open=K01`;
    vi.mocked(api.run).mockImplementation((id) => Promise.resolve({ ...끝난실행(예순), runId: id }));
    vi.spyOn(api, 'item').mockRejectedValue(new Error('상세 없음'));
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(줄수()).toBe(50));
    expect(줄단추('K01').getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => expect(줄수()).toBe(10));
    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?rowpage=2`);
  });

  it('판정 칩 · 디바이스 칩이 주소에 남는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
    await screen.findByText('이름-ZRR-002');

    fireEvent.click(칩('Fail'));
    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?status=FAIL`);
    fireEvent.click(screen.getByRole('button', { name: '모바일' }));

    expect(window.location.hash).toBe(`#/runs/${String(RUN_ID)}?status=FAIL&device=mobile`);
  });
});

describe('풀 길이 없는 거르개', () => {
  it('이전 실행이 없는 실행에 주소로 「회귀 실패」가 걸려 와도 줄을 거르지 않는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?change=new`;
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('이름-ZRR-002');
    expect(document.querySelectorAll('.rf-row')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /^회귀 실패/ })).toBeNull();
  });

  it('이전 실행이 있으면 주소의 「회귀 실패」가 걸려 그 변화의 줄만 남는다', async () => {
    window.location.hash = `#/runs/${String(RUN_ID)}?change=new`;
    vi.mocked(api.insights).mockResolvedValue(견줌);
    render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(줄수()).toBe(1));
    expect(document.querySelector('.rf-id')?.textContent).toBe('ZRR-001');
  });
});

describe('실행 기록에서 넘어온 조건(list=)', () => {
  it('칩을 눌러도 list= 가 주소에 남는다 — 새로고침한 뒤에도 「← 실행 기록」이 그 조건으로 돌아간다', async () => {
    window.location.hash = '#/runs/2112?list=state%3Dfailed%26page%3D2';
    render(<RunResult runId={2112} 판정하기={() => 실행까지} />);
    await screen.findByText('이름-ZRR-002');

    fireEvent.click(칩('Fail'));
    expect(window.location.hash).toBe('#/runs/2112?status=FAIL&list=state%3Dfailed%26page%3D2');
    fireEvent.click(screen.getByRole('button', { name: '모바일' }));

    expect(window.location.hash).toBe('#/runs/2112?status=FAIL&device=mobile&list=state%3Dfailed%26page%3D2');
    expect(screen.getByRole('link', { name: '← 실행 기록' }).getAttribute('href')).toMatch(/^#\/runs\/fn\?state=failed&page=2/);
  });

  it('쪽을 넘기고 줄을 펴도 list= 가 남는다', async () => {
    window.location.hash = '#/runs/2112?list=state%3Dfailed';
    vi.mocked(api.run).mockImplementation((id) => Promise.resolve({ ...끝난실행(예순), runId: id }));
    vi.spyOn(api, 'item').mockRejectedValue(new Error('상세 없음'));
    render(<RunResult runId={2112} 판정하기={() => 실행까지} />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await waitFor(() => expect(줄수()).toBe(10));
    fireEvent.click(줄단추('K55'));

    expect(window.location.hash).toBe('#/runs/2112?rowpage=2&open=K55&list=state%3Dfailed');
  });

  it('옆 실행으로 넘어가면 앞 실행에 건 거르개는 풀리고 list= 만 따라온다', async () => {
    window.location.hash = '#/runs/2112?status=FAIL&list=state%3Dfailed';
    const { rerender } = render(<RunResult runId={2112} 판정하기={() => 실행까지} />);
    await screen.findByText('이름-ZRR-001');
    expect(칩('Fail').getAttribute('aria-pressed')).toBe('true');

    window.location.hash = '#/runs/2111?list=state%3Dfailed';
    rerender(<RunResult runId={2111} 판정하기={() => 실행까지} />);

    await waitFor(() => expect(api.run).toHaveBeenCalledWith(2111));
    await waitFor(() => expect(칩('Fail').getAttribute('aria-pressed')).not.toBe('true'));
    expect(window.location.hash).toBe('#/runs/2111?list=state%3Dfailed');
  });

  it('조건 없이 열면 주소에 list= 를 만들어 넣지 않는다', async () => {
    window.location.hash = '#/runs/2112';
    render(<RunResult runId={2112} 판정하기={() => 실행까지} />);
    await screen.findByText('이름-ZRR-002');

    expect(window.location.hash).toBe('#/runs/2112');
  });
});
