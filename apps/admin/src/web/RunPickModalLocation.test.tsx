// @vitest-environment jsdom
// 여러 건 실행 모달의 실행 위치 고르개 검사 (SPEC §8.10) — RunPickModal.test.tsx 가 300줄을 넘어 떼어 냈다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { CaseRow, JsonSchema, Platform, ServiceRow } from './api.js';
import { RunPickModal } from './RunPickModal.js';

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
  color: '#123456',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: true,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

function 그리기(케이스들: CaseRow[] = [값없는케이스]) {
  const onRun = vi.fn();
  const onClose = vi.fn();
  render(<RunPickModal 케이스들={케이스들} service={서비스} onRun={onRun} onClose={onClose} />);
  return { onRun, onClose };
}

const 실행버튼 = () => screen.getByRole('button', { name: '실행' });

describe('RunPickModal 실행 위치 (SPEC §8.10)', () => {
  const 안드로이드케이스 = 케이스('ZPM-003', ['android'], 빈스키마);

  it('고른 것에 Android 앱이 있으면 고르개가 보이고 실행 요청에 location: local 이 실린다', () => {
    const { onRun } = 그리기([값없는케이스, 안드로이드케이스]);
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    expect(screen.getByText('실행 위치')).toBeTruthy();
    expect((실행버튼() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(실행버튼());

    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ location: 'local' }));
  });

  it('브라우저만이면 고르개가 없고 location 을 싣지 않는다', () => {
    const { onRun } = 그리기();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.click(실행버튼());

    expect(screen.queryByText('실행 위치')).toBeNull();
    expect(onRun.mock.calls[0]?.[0]).not.toHaveProperty('location');
  });
});
