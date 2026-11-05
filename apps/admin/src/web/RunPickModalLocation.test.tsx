// @vitest-environment jsdom
// 여러 건 실행 모달의 실행 위치 안내 검사 (SPEC §8.10) — RunPickModal.test.tsx 가 300줄을 넘어 떼어 냈다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow, type JsonSchema, type Platform, type ServiceRow } from './api.js';
import { RunPickModal } from './RunPickModal.js';
import { 시작누름 } from './runPick.fixture.js';

afterEach(() => {
  cleanup();
});

const 빈스키마: JsonSchema = {};

function 케이스(tcId: string, platforms: Platform[], paramSchema: JsonSchema): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms,
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema,
    expectedSchema: 빈스키마,
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

const 값없는케이스 = 케이스('ZPM-001', ['desktop', 'mobile'], 빈스키마);

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPM',
  name: '결제',
  color: '#123456', projectId: 1, projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: true,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

function 그리기(케이스들: CaseRow[] = [값없는케이스], 초기모바일?: 'server' | 'vision') {
  const onRun = vi.fn();
  const onClose = vi.fn();
  render(<RunPickModal 케이스들={케이스들} service={서비스} onRun={onRun} onClose={onClose} 초기모바일={초기모바일} />);
  return { onRun, onClose };
}

const 실행버튼 = () => screen.getByRole('button', { name: '실행' });

describe('RunPickModal 실행 위치 (SPEC §8.10)', () => {
  const 안드로이드케이스 = 케이스('ZPM-003', ['android'], 빈스키마);

  it('고른 것에 Android 앱이 있으면 안내 한 줄이 보이고 요청에는 location 을 싣지 않는다', () => {
    const { onRun } = 그리기([값없는케이스, 안드로이드케이스]);
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    expect(screen.getByText('Device VISION')).toBeTruthy();
    expect((실행버튼() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(실행버튼());
    시작누름();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0]?.[0]).not.toHaveProperty('location');
  });

  it('PC 만이면 실행 위치 덩이가 없고 location · mobileOn 을 싣지 않는다', () => {
    const { onRun } = 그리기([케이스('ZPM-004', ['desktop'], 빈스키마)]);
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.click(실행버튼());
    시작누름();

    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(onRun.mock.calls[0]?.[0]).not.toHaveProperty('location');
    expect(onRun.mock.calls[0]?.[0]).not.toHaveProperty('mobileOn');
  });

  it('모바일이 있으면 서버 흉내로 열려 mobileOn server 를 싣고, 실제 폰을 고르면 vision 을 싣는다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)', () => {
    const { onRun } = 그리기();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    expect((screen.getByRole('radio', { name: '가상 기기' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(실행버튼());
    시작누름();
    expect(onRun.mock.calls[0]?.[0].mobileOn).toBe('server');

    fireEvent.click(screen.getByRole('radio', { name: '실제 기기' }));
    fireEvent.click(실행버튼());
    시작누름();
    expect(onRun.mock.calls[1]?.[0].mobileOn).toBe('vision');
  });

  it('여는 쪽이 실제 폰을 미리 고르면 그것으로 열린다 — 다시 실행은 원래 실행이 돈 곳이다', () => {
    const { onRun } = 그리기([값없는케이스], 'vision');
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    expect((screen.getByRole('radio', { name: '실제 기기' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(실행버튼());
    시작누름();
    expect(onRun.mock.calls[0]?.[0].mobileOn).toBe('vision');
  });
});

describe('실행 칸이 테스트만인 사람의 실행 창 (도메인/인증 §3.5 「테스트 모드」)', () => {
  it('「시험 실행」만 있고 기록이 남는 실행 · 반복 · Slack 알림 · 건수 풀이는 안 그린다 — 모바일 웹 실행 위치는 시험 실행도 따라 그린다', () => {
    render(<RunPickModal 케이스들={[값없는케이스]} service={서비스} onRun={vi.fn()} onClose={vi.fn()} 정식={false} />);

    expect(screen.getByText('시험 실행할 케이스 1건')).toBeTruthy();
    expect(screen.getByRole('button', { name: '시험 실행' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '실행' })).toBeNull();
    expect(screen.queryByText('기록이 남습니다')).toBeNull();
    expect(screen.queryByLabelText('반복')).toBeNull();
    expect(screen.queryByText('완료 시 Slack 알림')).toBeNull();
    expect((screen.getByRole('radio', { name: '가상 기기' }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

describe('시험 실행의 모바일 웹 실행 위치 (도메인/실행 §3.2 「테스트 모드」 · WEB-F9-11)', () => {
  it('실제 기기를 고르고 시험 실행하면 모바일 칸에만 mobileOn vision 을 싣는다 — 시작 확인 창에도 「(실제 기기)」가 붙는다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockImplementation((tcId) => Promise.resolve({ trialId: `t-${tcId}` }));
    vi.spyOn(api, 'getTrial').mockResolvedValue({ status: 'DONE', result: { status: 'PASS', durationMs: 5, steps: [] } });
    try {
      render(<RunPickModal 케이스들={[값없는케이스]} service={서비스} onRun={vi.fn()} onClose={vi.fn()} 정식={false} />);
      fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
      fireEvent.click(screen.getByRole('radio', { name: '실제 기기' }));
      fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

      expect(screen.getByText('PC 1 · 모바일 1 (실제 기기)')).toBeTruthy();
      시작누름('시험 실행 시작');

      await waitFor(() => expect(시작).toHaveBeenCalledTimes(2));
      expect(시작.mock.calls.map(([, 몸]) => [몸.platform, 몸.mobileOn])).toEqual([['desktop', undefined], ['mobile', 'vision']]);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
