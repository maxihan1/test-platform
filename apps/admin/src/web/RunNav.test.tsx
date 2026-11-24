// @vitest-environment jsdom
// 실행 결과 위의 길 검사 — 「← 실행 기록」 · 「‹ 이전 실행」 · 「다음 실행 ›」 (도메인/실행 §8.7 「목록 화면과 결과 화면을 따로」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { 목록조건읽기, 실행기록주소, 실행길 } from './RunNav.js';

beforeEach(() => {
  window.location.hash = '#/runs/130';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 이웃(답: { prev: number | null; next: number | null } | Error) {
  return vi.spyOn(api, 'runNeighbors').mockImplementation(() => (답 instanceof Error ? Promise.reject(답) : Promise.resolve(답)));
}

describe('실행기록주소', () => {
  it('조건이 없으면 종류 주소 하나이고 애플리케이션 접두사만 있으면 그것만 단다', () => {
    expect(실행기록주소('fn', '', null)).toBe('#/runs/fn');
    expect(실행기록주소('ui', '', 'MKT')).toBe('#/runs/ui?service=MKT');
    expect(실행기록주소('e2e', '', 'MKT')).toBe('#/runs/e2e?service=MKT');
  });

  it('걸어 둔 조건을 그대로 두고 접두사는 그 실행의 것으로 덮는다 — 다른 애플리케이션을 고른 채 열어도 그 실행의 목록으로 간다', () => {
    expect(실행기록주소('fn', 'state=failed&page=2', 'MKT')).toBe('#/runs/fn?state=failed&page=2&service=MKT');
    expect(실행기록주소('fn', 'state=failed&service=ZRL', 'MKT')).toBe('#/runs/fn?state=failed&service=MKT');
  });
});

describe('목록조건읽기', () => {
  it('주소의 list= 가 건 조건이고 없으면 빈 글이다', () => {
    expect(목록조건읽기()).toBe('');
    window.location.hash = '#/runs/130?list=state%3Dfailed%26page%3D2';
    expect(목록조건읽기()).toBe('state=failed&page=2');
  });
});

describe('실행길 돌아가는 고리', () => {
  it('실행 기록으로 돌아간다 — 건 조건과 그 실행의 애플리케이션을 단다', async () => {
    window.location.hash = '#/runs/130?list=state%3Dfailed%26env%3Dstage';
    이웃({ prev: null, next: null });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    expect(screen.getByRole('link', { name: '← 실행 기록' }).getAttribute('href')).toBe('#/runs/fn?state=failed&env=stage&service=MKT');
  });

  it('주소에 조건이 없으면(다른 화면의 고리로 연 결과) 조건 없이 돌아간다', () => {
    이웃({ prev: null, next: null });
    render(<실행길 runId={130} 목록="ui" 접두사="MKT" />);

    expect(screen.getByRole('link', { name: '← 실행 기록' }).getAttribute('href')).toBe('#/runs/ui?service=MKT');
  });

  it('돌아갈 고리를 받으면 「← 실행 기록」 자리에 그것이 선다 — E2E 테스트 목록 · 시나리오에서 온 결과', () => {
    이웃({ prev: null, next: null });
    render(<실행길 runId={130} 목록="e2e" 접두사={null} 돌아갈={<a href="#/scenarios/7">← 시나리오</a>} />);

    expect(screen.getByRole('link', { name: '← 시나리오' }).getAttribute('href')).toBe('#/scenarios/7');
    expect(screen.queryByRole('link', { name: '← 실행 기록' })).toBeNull();
  });
});

describe('실행길 이전 · 다음 실행', () => {
  it('그 실행의 번호와 건 조건으로 앞뒤를 묻는다', async () => {
    window.location.hash = '#/runs/130?list=state%3Dfailed';
    const 스파이 = 이웃({ prev: 129, next: 131 });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    await waitFor(() => expect(스파이).toHaveBeenCalledWith(130, 'state=failed'));
  });

  it('번호가 있으면 고리이고 건 조건을 그대로 넘긴다 — 옮겨 가도 같은 조건으로 앞뒤를 짚는다', async () => {
    window.location.hash = '#/runs/130?list=state%3Dfailed';
    이웃({ prev: 129, next: 131 });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    expect((await screen.findByRole('link', { name: '‹ 이전 실행' })).getAttribute('href')).toBe('#/runs/129?list=state%3Dfailed');
    expect(screen.getByRole('link', { name: '다음 실행 ›' }).getAttribute('href')).toBe('#/runs/131?list=state%3Dfailed');
  });

  it('조건이 없으면 번호만 있는 주소다', async () => {
    이웃({ prev: 129, next: 131 });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    expect((await screen.findByRole('link', { name: '‹ 이전 실행' })).getAttribute('href')).toBe('#/runs/129');
    expect(screen.getByRole('link', { name: '다음 실행 ›' }).getAttribute('href')).toBe('#/runs/131');
  });

  it('앞이나 뒤가 없으면 그쪽은 꺼진 단추다 — 가장 새 실행에는 「다음 실행」이 없다', async () => {
    이웃({ prev: 129, next: null });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    await screen.findByRole('link', { name: '‹ 이전 실행' });
    const 다음 = screen.getByRole('button', { name: '다음 실행 ›' });
    expect(다음.hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('link', { name: '다음 실행 ›' })).toBeNull();
  });

  it('둘 다 없으면 둘 다 꺼진 단추다', async () => {
    const 스파이 = 이웃({ prev: null, next: null });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    await waitFor(() => expect(스파이).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: '‹ 이전 실행' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '다음 실행 ›' }).hasAttribute('disabled')).toBe(true);
  });

  it('조회가 실패해도 길은 선다 — 돌아가는 고리는 살고 앞뒤 단추만 꺼진다', async () => {
    const 스파이 = 이웃(new Error('502'));
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    await waitFor(() => expect(스파이).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: '← 실행 기록' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '‹ 이전 실행' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '다음 실행 ›' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('답을 기다리는 동안에는 꺼진 단추로 서 있다가 답이 오면 고리가 된다', async () => {
    이웃({ prev: 129, next: 131 });
    render(<실행길 runId={130} 목록="fn" 접두사="MKT" />);

    expect(screen.getByRole('button', { name: '‹ 이전 실행' }).hasAttribute('disabled')).toBe(true);
    expect(await screen.findByRole('link', { name: '‹ 이전 실행' })).toBeTruthy();
  });
});
