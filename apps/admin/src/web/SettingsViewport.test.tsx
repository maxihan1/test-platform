// @vitest-environment jsdom
// 서비스 설정 「화면 크기」 구획 — 대상 서버마다 판정 · 판정 시각 · 화면별 차이 펼치기

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ServicePanel } from './SettingsService.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 9,
  prefix: 'ZVP',
  name: '화면 크기 서비스',
  color: '#3A5FCD',
  envs: [
    { env: 'live', baseUrl: 'https://example.com', viewportKind: null, viewportJudgedAt: null },
    { env: 'qa', baseUrl: 'https://qa.example.com', viewportKind: 'responsive', viewportJudgedAt: '2026-10-16T10:40:00Z' },
  ],
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'zvp',
  isActive: true,
  caseCount: 3,
};

const 구획 = () => [...document.querySelectorAll<HTMLElement>('.set-card')].find((el) => el.querySelector('h3')?.textContent === '화면 크기')!;

describe('서비스 설정 「화면 크기」 구획 (도메인/인증 §8.8 · PRD-F10-08 시안 B)', () => {
  it('대상 서버마다 판정을 보이고, 훑기 전 서버는 「아직 판정 안 함」이며 펼칠 단추가 없다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    const 줄 = [...within(구획()).getAllByRole('row')].slice(1);
    expect(줄.map((r) => r.querySelector('td')?.textContent)).toEqual(['live', 'qa']);
    expect(within(줄[0]!).getByText('아직 판정 안 함')).toBeTruthy();
    expect(within(줄[0]!).queryByRole('button')).toBeNull();
    expect(within(줄[1]!).getByText('반응형')).toBeTruthy();
  });

  it('「화면별 차이」를 누르면 그 서버의 다른 화면만 사람 말로 펼치고 같은 화면은 수만 보인다', async () => {
    const 읽기 = vi.spyOn(api, 'settingsViewport').mockResolvedValue({
      items: [
        {
          state: '로그아웃',
          url: '/goods',
          name: '상품 목록',
          viewport: { 넘침: true, 선언: true, 구조같음: false, PC만: ['장바구니 담기'], 모바일만: ['메뉴 열기'] },
        },
      ],
      same: 18,
    });
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.click(within(구획()).getByRole('button', { name: '화면별 차이' }));

    expect(await within(구획()).findByText('상품 목록')).toBeTruthy();
    expect(읽기).toHaveBeenCalledWith(9, 'qa');
    expect(within(구획()).getByText('옆으로 밀어야 보임')).toBeTruthy();
    expect(within(구획()).getByText('배치가 다름')).toBeTruthy();
    expect(within(구획()).getByText('PC 에만 장바구니 담기')).toBeTruthy();
    expect(within(구획()).getByText('모바일에만 메뉴 열기')).toBeTruthy();
    expect(within(구획()).getByText('나머지 18장은 PC 와 모바일이 같습니다')).toBeTruthy();
  });

  it('새 서비스에는 구획이 없다 — 아직 훑은 서버가 없다', () => {
    render(<ServicePanel onDone={() => {}} />);
    expect(구획()).toBeUndefined();
  });
});
