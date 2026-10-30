// @vitest-environment jsdom
// 성능 테스트 › 페이지 성능 화면 검사 — 측정 요청 · 거절 · 오류 · 권한 (도메인/성능 §8.14)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError } from './api.js';
import { perfApi, type 실행상세 } from './perfApi.js';
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

describe('측정', () => {
  it('고른 조건으로 측정을 요청하고, 끝날 때까지 「측정 중」을 보이다가 표를 다시 읽는다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [] });
    vi.spyOn(perfApi, 'suggestPages').mockResolvedValue({ jobId: 9 });
    vi.spyOn(perfApi, 'job').mockResolvedValue({ status: 'DONE', output: { pages: 페이지들.map((it) => ({ ...it, why: '' })), basis: [] } });
    const 측정 = vi.spyOn(perfApi, 'measure').mockResolvedValue({ runId: 30 });
    let 상태: 실행상세['status'] = 'RUNNING';
    vi.spyOn(perfApi, 'runOf').mockImplementation(() => Promise.resolve(상세({ id: 30, status: 상태 })));
    const 읽기 = vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    render(<PerfPages service={앱} 쓰나 />);
    await screen.findByText('측정 대상: 화면 지도 기준 주요 페이지 3개');

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByLabelText('모바일'));
    fireEvent.click(screen.getByLabelText('Slow 4G'));
    fireEvent.click(screen.getByRole('button', { name: '측정' }));

    await waitFor(() => expect(측정).toHaveBeenCalledWith({ serviceId: 7, env: 'qa', pages: 페이지들, device: 'mobile', network: 'SLOW_4G' }));
    expect(await screen.findByRole('button', { name: '측정 중' })).toBeTruthy();
    expect(읽기).not.toHaveBeenCalled();
    expect(localStorage.getItem('대상서버:ZPP')).toBe('qa');

    상태 = 'DONE';
    expect(await screen.findByRole('table', { name: '페이지별 측정 결과' })).toBeTruthy();
    expect(읽기).toHaveBeenCalledWith(30);
    expect(screen.getByRole('button', { name: '다시 측정' })).toBeTruthy();
  });

  it('고른 에이전트가 없으면(409 NO_AGENT) 서버 말을 그 자리에 보인다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [줄({})] });
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    vi.spyOn(perfApi, 'measure').mockRejectedValue(new ApiError(409, 'NO_AGENT', '', []));
    render(<PerfPages service={앱} 쓰나 />);
    await screen.findByRole('table', { name: '페이지별 측정 결과' });
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '다시 측정' }));
    expect((await screen.findByRole('alert')).textContent).toBe('고른 부하 발생 에이전트가 연결돼 있지 않습니다');
    expect(screen.getByRole('button', { name: '다시 측정' })).toBeTruthy();
  });

  it('로그인 화면이 없다는 400 은 서버가 준 까닭을 붙여 보인다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [줄({})] });
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    vi.spyOn(perfApi, 'measure').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '로그인 화면 기록이 없어 /my 를 열 수 없습니다', []));
    render(<PerfPages service={앱} 쓰나 />);
    await screen.findByRole('table', { name: '페이지별 측정 결과' });
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '다시 측정' }));
    expect((await screen.findByRole('alert')).textContent).toContain('로그인 화면 기록이 없어 /my 를 열 수 없습니다');
  });

  it('측정이 오류로 끝나면 로그의 마지막 경고 줄을 보인다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [줄({})] });
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    vi.spyOn(perfApi, 'measure').mockResolvedValue({ runId: 30 });
    vi.spyOn(perfApi, 'runOf').mockImplementation((id) => Promise.resolve(id === 30 ? 상세({ id: 30, status: 'ERROR' }) : 상세()));
    vi.spyOn(perfApi, 'events').mockResolvedValue({
      events: [
        { at: '2026-10-21T05:00:00Z', level: 'info', message: '측정을 시작합니다' },
        { at: '2026-10-21T05:01:00Z', level: 'warn', message: '브라우저를 열지 못했습니다' },
      ],
    });
    render(<PerfPages service={앱} 쓰나 />);
    await screen.findByRole('table', { name: '페이지별 측정 결과' });
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: '다시 측정' }));
    expect((await screen.findByRole('alert')).textContent).toBe('측정이 오류로 끝났습니다 — 브라우저를 열지 못했습니다');
  });

  it('실행 쓰기 권한이 없으면 측정 · 조건 · 페이지 선택이 없다', async () => {
    vi.spyOn(perfApi, 'pagesRuns').mockResolvedValue({ runs: [줄({})] });
    vi.spyOn(perfApi, 'runOf').mockResolvedValue(상세());
    vi.spyOn(perfApi, 'pages').mockResolvedValue(결과);
    render(<PerfPages service={앱} 쓰나={false} />);
    await screen.findByRole('table', { name: '페이지별 측정 결과' });
    expect(screen.queryByRole('button', { name: '다시 측정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '페이지 선택' })).toBeNull();
    expect((screen.getByLabelText('모바일') as HTMLInputElement).disabled).toBe(true);
  });
});
