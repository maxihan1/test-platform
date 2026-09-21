// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type SettingsServiceRow } from './api.js';
import { ServiceSection } from './SettingsService.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSS',
  name: '설정 서비스',
  color: '#3A5FCD',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  testsRepo: 'https://github.com/example/tests',
  testsDir: 'zss',
  isActive: true,
  caseCount: 3,
};

const 경고문 = /서비스 표시가 잘 안 보입니다/;

function 편집을연다() {
  render(<ServiceSection rows={[서비스]} onDone={() => {}} />);
  fireEvent.click(screen.getByText('편집'));
  return screen.getByLabelText('색 코드') as HTMLInputElement;
}

describe('설정 화면의 서비스 색 (SPEC §8.8 · DESIGN.md)', () => {
  it('흰 면과 명암비 3 에 못 미치는 색을 넣으면 경고 문구가 뜬다', () => {
    const 색칸 = 편집을연다();
    expect(screen.queryByText(경고문)).toBeNull();

    fireEvent.change(색칸, { target: { value: '#DDDDDD' } });

    expect(screen.getByText(경고문).textContent).toContain('기준 3');
  });

  it('기준을 넘는 색에는 경고를 띄우지 않는다', () => {
    const 색칸 = 편집을연다();

    fireEvent.change(색칸, { target: { value: '#888888' } });

    expect(screen.queryByText(경고문)).toBeNull();
  });

  it('명암비 경고는 알리기만 한다. 저장을 막지 않는다', async () => {
    const 고치기 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const 색칸 = 편집을연다();

    fireEvent.change(색칸, { target: { value: '#DDDDDD' } });
    expect(screen.getByText(경고문)).toBeTruthy();

    const 저장 = screen.getByText('저장') as HTMLButtonElement;
    expect(저장.disabled).toBe(false);
    fireEvent.click(저장);

    await waitFor(() => {
      expect(고치기).toHaveBeenCalledTimes(1);
    });
    expect(고치기.mock.calls[0]?.[1].color).toBe('#DDDDDD');
  });
});
