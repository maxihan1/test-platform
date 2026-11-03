// @vitest-environment jsdom
// E2E 시나리오 조립 화면 — 실행 칸이 테스트만(trial)인 사람은 고치지 못하고 저장된 그대로 시험 실행만 한다 (도메인/인증 §3.5 「테스트 모드」 · TMO-F5-02 시안 C)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { 사람, 단계셋, 기존그리기, 서버고르기, 시험누르기, 탭 } from './ScenarioTrial.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.location.hash = '';
  sessionStorage.clear();
});

describe('실행 칸이 테스트만인 사람의 조립 화면', () => {
  it('저장 · 실행 · 단계 추가가 없고 시험 실행 단추 · 시험 결과 탭 · 안내가 있으며 이름은 읽기 전용이다', async () => {
    await 기존그리기(단계셋, 사람('trial'));

    expect(screen.getByRole('button', { name: '시험 실행' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
    expect(screen.queryByRole('tab', { name: '단계 추가' })).toBeNull();
    expect(screen.getByRole('tab', { name: '시험 결과' })).toBeTruthy();
    expect(screen.getByText('테스트만 하는 권한이라 저장된 시나리오를 그대로 시험 실행합니다')).toBeTruthy();
    expect(screen.queryByText('실행 권한이 있어야 고치고 돌릴 수 있습니다')).toBeNull();
    expect((screen.getByLabelText('시나리오 이름') as HTMLInputElement).readOnly).toBe(true);
  });

  it('시험 실행을 누르면 저장된 단계 그대로 보내고 시험 결과 탭이 열린다', async () => {
    const { container } = await 기존그리기(단계셋, 사람('trial'));
    const start = vi.spyOn(scenarioApi, 'startTrial').mockResolvedValue({ trialId: 't-1' });
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'RUNNING' });
    vi.useFakeTimers();
    서버고르기('stg');

    await 시험누르기();

    expect(start).toHaveBeenCalledWith({ service: 'ZSB', env: 'stg', platform: 'desktop', parts: 단계셋 });
    expect(탭(container)).toBe('trial');
  });

  it('실행 읽기면 시험 실행 단추도 시험 결과 탭도 없다', async () => {
    await 기존그리기(단계셋, 사람('read'));

    expect(screen.queryByRole('button', { name: '시험 실행' })).toBeNull();
    expect(screen.queryByRole('tab', { name: '시험 결과' })).toBeNull();
  });
});
