// @vitest-environment jsdom
// 케이스 목록 맥락 — 기능 묶음 이름표 · 왼쪽 목차 · 「더 보기」 이어 받기 (도메인/카탈로그 §8.1 「맥락」 · 「이어 불러오기」, 2026-11-11 시안 B)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage } from './api.js';
import { CaseList } from './CaseList.js';
import { 겹침, 그리기, 더보기, 마지막조건, 목차, 목차줄들, 묶음들, 비번, 이름표들, 전부된다, 쪽, 쪽나눔, 케이스, 화면 } from './CaseListContext.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('기능 묶음 이름표', () => {
  it('기능 묶음마다 이름 · 건수 · 실패를 단 이름표가 서고, 묶음 없는 케이스는 「PRD 에 연결되지 않은 케이스」를 단다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-003');
    expect(이름표들()).toEqual([
      ['회원가입', '2건', '실패 1'],
      ['기능 묶음 없음', '1건', 'PRD 에 연결되지 않은 케이스'],
    ]);
  });

  it('이름표는 묶음 상자(section) 맨 앞에 서고 줄 사이에 끼는 접는 머리가 없다 — 화면 · 화면 조각 머리와 접기 단추가 없다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-003');
    const 상자들 = [...document.querySelectorAll('section[data-toc]')];
    expect(상자들.map((상자) => [상자.getAttribute('data-toc'), 상자.firstElementChild?.className, 상자.querySelectorAll('.row').length])).toEqual([
      ['회원가입', 'toc-label', 2],
      ['', 'toc-label', 1],
    ]);
    expect(document.querySelector('.grp')).toBeNull();
    expect(screen.queryByRole('button', { name: '모두 접기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /만 보기$/ })).toBeNull();
    expect(screen.queryByText(/앞 페이지에서 이어짐/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^회원가입\s*\d+건/ })).toBeNull();
  });

  it('건수는 받은 줄이 아니라 조건에 맞는 전부(groups)로 센다 — 한 쪽만 받아도 이름표는 전체 건수다', async () => {
    그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByText('ZCL-FN-003')).toBeNull();
    expect(이름표들()).toEqual([['회원가입', '2건', '실패 1']]);
  });

  it('PRD 를 안 쓰는 애플리케이션은 이름표도 목차도 없고 줄만 선다', async () => {
    그리기({ 받을쪽: { items: [케이스('ZCL-FN-009')], total: 1, page: 1, pageSize: 50, groups: [{ feature: null, screen: null, screenUrl: null, part: null, tcIds: ['ZCL-FN-009'] }] } });
    await screen.findByText('ZCL-FN-009');
    expect(document.querySelector('.toc-label')).toBeNull();
    expect(목차()).toBeNull();
    expect(document.querySelectorAll('.row.pickable')).toHaveLength(1);
  });

  it('칩을 걸면 서버가 거른 번호표대로 이름표 건수가 선다 — 화면이 보이는 줄로 다시 세지 않는다', async () => {
    const 전체쪽: CasePage = { ...쪽, lastCounts: { total: 3, pass: 2, fail: 1, na: 0 } };
    const 실패만: CasePage = {
      ...전체쪽,
      items: [비번],
      total: 1,
      groups: [{ feature: '회원가입', screen: 화면, screenUrl: '/signup', part: null, tcIds: ['ZCL-FN-001'] }],
    };
    vi.spyOn(api, 'lastScan').mockResolvedValue(null);
    vi.spyOn(api, 'lastByCase').mockResolvedValue({
      items: [{ tcId: 'ZCL-FN-001', platform: 'desktop', status: 'FAIL', runId: 1, historyId: 1, finishedAt: '2026-10-11T00:00:00.000Z', durationMs: 10, recent: ['FAIL'] }],
    } as Awaited<ReturnType<typeof api.lastByCase>>);
    const 스파이 = vi.spyOn(api, 'cases').mockImplementation((q) => Promise.resolve(q.last === 'FAIL' ? 실패만 : 전체쪽));
    render(<CaseList kind="FN" service="ZCL" 할수={전부된다} 결과보나 요구보나 />);
    await screen.findByText('ZCL-FN-003');

    fireEvent.click(screen.getByRole('button', { name: /^실패 \d+$/ }));

    await waitFor(() => expect(이름표들()).toEqual([['회원가입', '1건', '실패 1']]));
    expect(screen.queryByText('ZCL-FN-002')).toBeNull();
    expect(마지막조건(스파이)).toMatchObject({ last: 'FAIL' });
  });
});

describe('기능 묶음 목차', () => {
  it('묶음이 둘 이상이면 왼쪽에 목차가 서고 줄마다 이름 · 실패 수 · 건수가 붙는다', async () => {
    그리기();
    await screen.findByText('ZCL-FN-003');
    expect(목차줄들()).toEqual([
      ['회원가입', '실패 1', '2'],
      ['기능 묶음 없음', '1'],
    ]);
    await waitFor(() => expect(within(목차()!).getAllByRole('button').filter((줄) => 줄.getAttribute('aria-current') === 'true')).toHaveLength(1));
  });

  it('묶음이 하나뿐이면 목차가 없다 — 이름표는 남는다', async () => {
    그리기({ 받을쪽: { ...쪽, items: [겹침, 비번], total: 2, groups: 묶음들.slice(0, 2) } });
    await screen.findByText('ZCL-FN-001');
    expect(목차()).toBeNull();
    expect(이름표들()).toEqual([['회원가입', '2건', '실패 1']]);
  });

  it('실행 결과 읽기 권한이 없어도 목차 건수는 서고 실패 수만 빠진다', async () => {
    vi.spyOn(api, 'lastScan').mockResolvedValue(null);
    vi.spyOn(api, 'cases').mockResolvedValue(쪽);
    render(<CaseList kind="FN" service="ZCL" 할수={전부된다} 결과보나={false} />);
    await screen.findByText('ZCL-FN-003');
    expect(목차줄들()).toEqual([['회원가입', '2'], ['기능 묶음 없음', '1']]);
  });

  it('아직 안 받은 묶음을 목차에서 누르면 닿을 때까지 다음 쪽을 받는다', async () => {
    const 스파이 = 그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByText('ZCL-FN-003')).toBeNull();
    expect(목차줄들().map((줄) => 줄[0])).toEqual(['회원가입', '기능 묶음 없음']);

    fireEvent.click(within(목차()!).getByRole('button', { name: /^기능 묶음 없음/ }));

    expect(await screen.findByText('ZCL-FN-003')).toBeTruthy();
    expect(이름표들()).toEqual([
      ['회원가입', '2건', '실패 1'],
      ['기능 묶음 없음', '1건', 'PRD 에 연결되지 않은 케이스'],
    ]);
    expect(스파이.mock.calls.map(([q]) => q.page)).toEqual([1, 2]);
  });

  it('이미 받은 묶음을 누르면 쪽을 더 받지 않는다', async () => {
    const 스파이 = 그리기();
    await screen.findByText('ZCL-FN-003');
    스파이.mockClear();

    fireEvent.click(within(목차()!).getByRole('button', { name: /^기능 묶음 없음/ }));

    expect(스파이).not.toHaveBeenCalled();
  });
});

describe('이어 불러오기 (쪽 넘기기 없음)', () => {
  it('이전 · 다음 단추도 쪽 번호도 없다 — 더 받을 것이 있으면 「N건 중 M건 · 더 보기」만 선다', async () => {
    그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    expect(screen.queryByRole('button', { name: '다음' })).toBeNull();
    expect(screen.queryByRole('button', { name: '이전' })).toBeNull();
    expect(더보기()).toBeTruthy();
  });

  it('「더 보기」는 다음 쪽을 아래에 붙인다 — 앞 줄이 남고 고른 것도 그대로이며 더 받을 것이 없으면 단추가 사라진다', async () => {
    const 스파이 = 그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');
    fireEvent.click(screen.getByRole('checkbox', { name: 'ZCL-FN-002 ZCL-FN-002 케이스 선택' }));

    fireEvent.click(더보기());

    expect(await screen.findByText('ZCL-FN-003')).toBeTruthy();
    expect(마지막조건(스파이)).toMatchObject({ page: 2 });
    expect(screen.getByText('ZCL-FN-001')).toBeTruthy();
    expect(screen.getByText('ZCL-FN-002')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: 'ZCL-FN-002 ZCL-FN-002 케이스 선택' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'ZCL-FN-003 ZCL-FN-003 케이스 선택' }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('toolbar', { name: '선택한 케이스' }).textContent).toContain('1건 선택');
    expect(screen.queryByRole('button', { name: /더 보기$/ })).toBeNull();
    expect(window.location.hash).not.toContain('page=');
  });

  it('붙인 뒤 앞 쪽 묶음에 뒤 쪽 줄이 이어 붙지 않고 제 묶음 상자에 들어가며 목차 건수는 그대로다', async () => {
    그리기({ 받을쪽: 쪽나눔 });
    await screen.findByText('ZCL-FN-001');

    fireEvent.click(더보기());
    await screen.findByText('ZCL-FN-003');

    expect(document.querySelectorAll('section[data-toc="회원가입"] .row')).toHaveLength(2);
    expect(document.querySelectorAll('section[data-toc=""] .row')).toHaveLength(1);
    expect(목차줄들()).toEqual([['회원가입', '실패 1', '2'], ['기능 묶음 없음', '1']]);
  });
});
