// @vitest-environment jsdom
// 대시보드 「QA 리포트 · 승인 전」 칸 검사 (도메인/리포팅 §8.21 「다른 화면의 고리」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { User } from './api.js';
import { 승인전칸 } from './DashboardQaReport.js';
import { 대시보드재료 } from './layout.js';
import { qaReportApi } from './qaReportApi.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 앱들 = [
  { id: 1, prefix: 'DMW', name: '데모마켓 웹' },
  { id: 2, prefix: 'DMA', name: '데모마켓 앱' },
  { id: 3, prefix: 'DMI', name: '데모마켓 API' },
];

describe('대시보드 QA 리포트 · 승인 전 칸', () => {
  it('애플리케이션마다 승인 전 수를 더하고, 누르면 승인 전이 있는 첫 애플리케이션으로 바꿔 승인 전 필터로 간다', async () => {
    const 수 = { DMW: 0, DMA: 2, DMI: 1 } as Record<string, number>;
    const 목록 = vi.spyOn(qaReportApi, 'list').mockImplementation((service) => Promise.resolve({ items: [], total: 수[service] ?? 0 }));
    const 열기 = vi.fn();
    render(<승인전칸 차례={5} 앱들={앱들} 서비스열기={열기} />);
    expect(await screen.findByText('데모마켓 앱 2 · 데모마켓 API 1')).toBeTruthy();
    expect(목록).toHaveBeenCalledWith('DMA', { approved: false });
    const 링크 = screen.getByRole('link');
    expect(링크.textContent).toContain('QA 리포트 · 승인 전');
    expect(링크.textContent).toContain('3');
    expect(링크.getAttribute('href')).toBe('#/qa-reports?approved=false');
    fireEvent.click(링크);
    expect(열기).toHaveBeenCalledWith(2);
  });

  it('승인 전이 없으면 0 과 안내 한 줄이고 애플리케이션을 바꾸지 않는다', async () => {
    vi.spyOn(qaReportApi, 'list').mockResolvedValue({ items: [], total: 0 });
    const 열기 = vi.fn();
    render(<승인전칸 차례={5} 앱들={앱들} 서비스열기={열기} />);
    expect(await screen.findByText('승인 전 리포트 없음')).toBeTruthy();
    fireEvent.click(screen.getByRole('link'));
    expect(열기).not.toHaveBeenCalled();
  });

  it('애플리케이션 하나가 실패해도 나머지 수는 보인다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(qaReportApi, 'list').mockImplementation((service) => (service === 'DMA' ? Promise.reject(new Error('boom')) : Promise.resolve({ items: [], total: 2 })));
    render(<승인전칸 차례={5} 앱들={앱들} 서비스열기={vi.fn()} />);
    expect(await screen.findByText('데모마켓 웹 2 · 데모마켓 API 2')).toBeTruthy();
  });

  it('칸은 관리자에게만 선다 — 고른 프로젝트의 애플리케이션을 센다', () => {
    const 앱 = (id: number, prefix: string, projectId: number) => ({ id, prefix, name: prefix, projectId, permissions: { cases: 'write', runs: 'write', authoring: 'write' } });
    const 사람 = (role: 'admin' | 'member') =>
      ({ username: 'park', displayName: '박지훈', role, mustChangePassword: false, services: [앱(1, 'DMW', 10), 앱(2, 'DMA', 10), 앱(3, 'PAY', 20)] }) as unknown as User;
    expect(대시보드재료(사람('admin'), 'DMW').승인볼앱들?.map((a) => a.prefix)).toEqual(['DMW', 'DMA']);
    expect(대시보드재료(사람('member'), 'DMW').승인볼앱들).toBeNull();
  });
});
