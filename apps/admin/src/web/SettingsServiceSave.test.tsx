// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { SettingsServiceRow } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { ServicePanel } from './SettingsService.js';
import { 탭열기 } from './SettingsTabs.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSV',
  name: '저장 줄 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: true,
  testsRepo: 'https://github.com/example/tests',
  testsDir: 'zsv',
  isActive: true,
  caseCount: 3,
};

const 선택됨 = (이름: string) => screen.getByRole('tab', { name: new RegExp(`^${이름}`) }).getAttribute('aria-selected');

describe('저장 줄은 다른 탭의 일을 같이 말한다 (도메인/인증 §8.8 · 2026-11-27)', () => {
  it('다른 탭에 저장 안 한 변경이 있으면 그 탭 이름을 「같이 저장됩니다」로 보인다 — 웹훅을 비워 둔 채 이름만 저장하는 일을 막는다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    탭열기('알림 · 연동');
    fireEvent.click(screen.getByRole('button', { name: 'Slack 웹훅 변경' }));
    탭열기('기본 정보');

    expect(screen.getByText('다른 탭의 변경도 같이 저장됩니다 · 알림 · 연동')).toBeTruthy();
  });

  it('지금 탭의 변경만 있으면 「같이 저장됩니다」를 보이지 않는다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '바꾼 이름' } });

    expect(screen.queryByText(/다른 탭의 변경도 같이 저장됩니다/)).toBeNull();
  });

  it('못 보내는 이유가 다른 탭 칸에 있으면 그 탭으로 가는 단추를 달고, 누르면 그 탭이 열린다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);
    탭열기('실행');
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: '' } });
    탭열기('기본 정보');

    expect(screen.getByText(/대상 서버에 비어 있는 항목이 있습니다/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '실행 탭에서 확인' }));

    expect(선택됨('실행')).toBe('true');
    expect(screen.queryByRole('button', { name: '실행 탭에서 확인' })).toBeNull();
  });
});
