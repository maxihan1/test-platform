// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { type SettingsServiceRow } from './api.js';
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

function 그린다() {
  render(<ServiceSection rows={[서비스]} onDone={() => {}} />);
  fireEvent.click(screen.getByText('편집'));
}

describe('설정에서 색 고르개를 걷었다 (SPEC §8.8, 2026-09-22)', () => {
  // 화면 어디에도 안 쓰이는 색을 고르게 두면 「고르면 뭐가 달라지나」에 답할 수 없다
  it('색을 고르는 칸이 없다', () => {
    그린다();
    expect(screen.queryByLabelText('색 코드')).toBeNull();
    expect(document.querySelector('input[type="color"]')).toBeNull();
    expect(document.querySelector('.set-preview')).toBeNull();
  });

  it('명암비 경고 자리도 없다. 잴 면이 사라졌다', () => {
    그린다();
    expect(document.body.textContent).not.toContain('명암비');
  });
});

