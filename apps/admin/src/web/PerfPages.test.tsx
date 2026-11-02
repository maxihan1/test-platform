// @vitest-environment jsdom
// 성능 테스트 › 페이지 성능 화면 검사 — 가장 최근 측정 · 워터폴 · AI 추천 · 측정 요청 · 오류 (도메인/성능 §8.14)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError } from './api.js';
import { perfApi } from './perfApi.js';
import { PerfPages } from './PerfPages.js';
import { 결과, 상세, 앱, 줄, 페이지들 } from './perfPages.fixture.js';
import { 묻는간격 } from './usePerfJob.js';

beforeEach(() => {
  묻는간격.ms = 20;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  묻는간격.ms = 3000;
});


describe('가장 최근 측정', () => {
  function 최근열기() {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [줄({ id: 20 }), 줄({ id: 21 })] });
    const 읽기 = vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    return 읽기;
  }

  it('가장 최근 PAGE 실행의 표를 그리고 목표를 넘은 페이지는 실패다. 부하 중 값으로 실패한 줄에는 「부하 중」이 붙는다', async () => {
    const 읽기 = 최근열기();
    const { container } = render(<PerfPages service={앱} 쓰나 />);
    const 표 = await screen.findByRole('table', { name: '페이지별 측정 결과' });

    expect(읽기).toHaveBeenCalledWith(21);
    expect(container.querySelector('h1')!.textContent).toContain('성능 테스트');
    expect(container.querySelector('.head-meta')!.textContent).toContain('최근 측정');
    expect(container.querySelector('.head-meta')!.textContent).toContain('페이지별 3회 측정 중앙값');
    expect(screen.getByText('목표 LCP 2.5초 · FCP 1.8초 · CLS 0.1 이하')).toBeTruthy();

    const 열 = (이름: string) => within(표).getByText(이름).closest('tr')!;
    const 메인 = 열('메인');
    expect(within(메인).getByText('통과').className).toContain('v-pass');
    expect(within(메인).getByText('2.2초')).toBeTruthy();
    expect(within(메인).getByText('0.02')).toBeTruthy();

    const 목록 = 열('상품 목록');
    expect(within(목록).getByText('실패').className).toContain('v-fail');
    expect(within(목록).getByText('부하 중')).toBeTruthy();
    expect(within(목록).getByText('3.8초').className).toContain('perf-err');
    expect(within(목록).getByText('1.2초').className).not.toContain('perf-err');

    const 상세줄 = 열('상품 상세');
    expect(within(상세줄).getByText('실패').className).toContain('v-fail');
    expect(within(상세줄).queryByText('부하 중')).toBeNull();
    expect(within(상세줄).getByText('2.9초').className).toContain('perf-err');
    expect(within(상세줄).getByText('0.18').className).toContain('perf-err');
    expect(within(상세줄).getByText('0.8초').className).not.toContain('perf-err');
    expect(within(상세줄).getAllByText('-')).toHaveLength(1);

    expect(screen.getByRole('link', { name: 'PRF-0012' }).getAttribute('href')).toBe('#/perf/runs/12');
    expect(screen.getByText(/부하 중 값: 성능 실행/).textContent).toContain('가상 사용자 1,350명 시점');
  });

  it('주소의 실행 번호가 있으면 가장 최근 대신 그 실행을 연다. 조건은 그 실행 것이다', async () => {
    const 목록 = vi.spyOn(perfApi, 'pagesRuns');
    const 읽기 = vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세({ id: 15 }));
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    render(<PerfPages service={앱} run={15} 쓰나 />);
    await screen.findByRole('table', { name: '페이지별 측정 결과' });
    expect(읽기).toHaveBeenCalledWith(15);
    expect(목록).not.toHaveBeenCalled();
    expect((screen.getByLabelText('모바일') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Slow 4G') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('qa');
  });

  it('줄을 누르면(키보드로도) 그 페이지의 워터폴과 AI 분석이 선다. 분석이 없는 페이지는 칸을 그리지 않는다', async () => {
    최근열기();
    render(<PerfPages service={앱} 쓰나 />);
    // 처음에는 실패한 페이지가 골라져 있다
    expect(await screen.findByRole('heading', { name: '상품 상세 로딩 워터폴' })).toBeTruthy();
    const 그림 = screen.getByRole('img');
    expect(그림.getAttribute('aria-label')).toBe('HTML 문서 0.2초, JS 번들 0.5초, 대표 상품 이미지 1.6초이 차례로 걸려 LCP가 2.9초인 그림');
    expect(within(그림).getByText('2.9초 (LCP 요소: img hero.jpg)')).toBeTruthy();
    // 가장 오래 걸린 막대만 띄운다 — 판정이 아니라서 실패 색은 쓰지 않는다
    expect(within(그림).getByText('1.6초').className).toContain('pp-hot-num');
    expect(within(그림).getByText('0.5초').className).not.toContain('pp-hot-num');
    expect(그림.querySelectorAll('.pp-track span.hot')).toHaveLength(1);
    const 이미지막대 = within(그림).getByText('대표 상품 이미지').nextElementSibling!.querySelector('span')!;
    // 시작 1100ms · 걸린 1600ms · 전체 2900ms(LCP 와 마지막 끝 2700 중 큰 값)
    expect(이미지막대.style.left).toBe('37.9%');
    expect(이미지막대.style.width).toBe('55.2%');
    expect(screen.getByText('AI 분석')).toBeTruthy();
    expect(screen.getByText('CLS 0.18: 이미지 영역 크기를 지정해야 합니다')).toBeTruthy();

    fireEvent.click(screen.getByText('상품 목록'));
    expect(screen.getByRole('heading', { name: '상품 목록 로딩 워터폴' })).toBeTruthy();
    expect(screen.queryByText('AI 분석')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /상품 상세/ }));
    expect(screen.getByRole('heading', { name: '상품 상세 로딩 워터폴' })).toBeTruthy();
  });
});

describe('측정할 페이지', () => {
  it('측정이 하나도 없으면 AI 추천을 받아 그 개수를 AI 줄에 보인다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [] });
    const 추천 = vi.spyOn(perfApi, 'suggestPages').mockResolvedValue({ jobId: 9 });
    vi.spyOn(perfApi, 'job').mockResolvedValue({
      status: 'DONE',
      output: { pages: [...페이지들.map((it) => ({ ...it, why: '주요 화면' }))], basis: ['화면 기록 3건'] },
    });
    render(<PerfPages service={앱} 쓰나 />);
    expect(await screen.findByText('측정 대상: 화면 지도 기준 주요 페이지 3개')).toBeTruthy();
    expect(추천).toHaveBeenCalledWith(7, 'qa');
    expect(screen.getByText('AI', { selector: '.perf-ai' })).toBeTruthy();
    expect(screen.getByText('아직 측정 결과가 없습니다. 측정을 누르면 페이지마다 속도를 잽니다')).toBeTruthy();
  });

  it('화면 기록이 없어 추천을 못 받으면(409 NO_DATA) 메인 한 페이지로 시작한다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [] });
    vi.spyOn(perfApi, 'suggestPages').mockRejectedValue(new ApiError(409, 'NO_DATA', '', []));
    render(<PerfPages service={앱} 쓰나 />);
    expect(await screen.findByText('측정 대상: 페이지 1개')).toBeTruthy();
    expect(screen.queryByText('AI', { selector: '.perf-ai' })).toBeNull();
  });

  it('「페이지 선택」에서 빼고 더한다. 경로는 /로 시작해야 하고 이름을 비우면 경로가 이름이다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [줄({})] });
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    const 측정 = vi.spyOn(perfApi, 'measure').mockResolvedValue({ runId: 30 });
    render(<PerfPages service={앱} 쓰나 />);
    await screen.findByRole('table', { name: '페이지별 측정 결과' });

    fireEvent.click(screen.getByRole('button', { name: '페이지 선택' }));
    const 창 = within(screen.getByRole('dialog'));
    fireEvent.click(창.getByRole('button', { name: '메인 빼기' }));
    fireEvent.change(창.getByLabelText('경로'), { target: { value: 'cart' } });
    fireEvent.click(창.getByRole('button', { name: '추가' }));
    expect((await 창.findByRole('alert')).textContent).toBe('경로는 /로 시작해야 합니다');
    fireEvent.change(창.getByLabelText('경로'), { target: { value: '/cart' } });
    fireEvent.click(창.getByRole('button', { name: '추가' }));
    fireEvent.click(창.getByRole('button', { name: '적용' }));

    expect(screen.getByText('측정 대상: 페이지 3개')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 측정' }));
    await waitFor(() => expect(측정).toHaveBeenCalled());
    expect(측정.mock.calls[0]![0].pages).toEqual([
      { url: '/products', name: '상품 목록', login: false },
      { url: '/products/1', name: '상품 상세', login: false },
      { url: '/cart', name: '/cart', login: false },
    ]);
  });
});
