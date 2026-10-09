// @vitest-environment jsdom
// 실행 결과 머리의 「실패 N건 다시 실행」 (도메인/실행 §8.3 · §8.10)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type CaseRow, type ItemStatus, type Platform, type RunItemSummary } from './api.js';
import { 실패다시실행, 실패케이스들 } from './RerunFailed.js';
import { 사람 } from './runPick.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

let 번호 = 0;

function 항목(tcId: string, status: ItemStatus, platform: Platform = 'desktop'): RunItemSummary {
  번호 += 1;
  return {
    historyId: 번호,
    tcId,
    tcName: `${tcId} 케이스`,
    platform,
    attempt: 1,
    params: {},
    paramSchema: {},
    status,
    durationMs: 10,
    error: null,
    startedAt: '2026-09-21T00:00:00.000Z',
    finishedAt: '2026-09-21T00:00:01.000Z',
  };
}

const 케이스 = (tcId: string): CaseRow => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  filePath: `tests/${tcId}.spec.ts`,
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
});

describe('실패케이스들', () => {
  it('FAIL 인 tcId 만 중복 없이 처음 나온 차례로 모은다', () => {
    const items = [
      항목('ZRS-001', 'PASS'),
      항목('ZRS-002', 'FAIL', 'desktop'),
      항목('ZRS-002', 'FAIL', 'mobile'),
      항목('ZRS-003', 'NA'),
      항목('ZRS-004', 'FAIL'),
      항목('ZRS-001', 'FAIL', 'mobile'),
    ];

    expect(실패케이스들(items)).toEqual(['ZRS-002', 'ZRS-004', 'ZRS-001']);
  });

  it('실패가 없으면 빈 목록이다', () => {
    expect(실패케이스들([항목('ZRS-001', 'PASS'), 항목('ZRS-002', 'NA')])).toEqual([]);
  });
});

describe('실패다시실행', () => {
  const 실패둘 = [항목('ZRS-001', 'FAIL'), 항목('ZRS-001', 'FAIL', 'mobile'), 항목('ZRS-002', 'FAIL'), 항목('ZRS-003', 'PASS')];

  it('버튼 글자에 중복을 뺀 실패 케이스 건수가 든다', () => {
    render(<실패다시실행 items={실패둘} env="qa" 된다 />);

    expect(screen.getByRole('button', { name: '실패 2건 다시 실행' })).toBeTruthy();
  });

  it('실행 권한이 없으면(된다=false) 버튼이 없다', () => {
    render(<실패다시실행 items={실패둘} env="qa" 된다={false} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('실패가 하나도 없으면 버튼이 없다', () => {
    render(<실패다시실행 items={[항목('ZRS-001', 'PASS')]} env="qa" 된다 />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('누르면 실패한 케이스만 담은 창이 그 실행의 서버가 골라진 채로 열린다', async () => {
    const 읽기 = vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve(케이스(tcId)));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    render(<실패다시실행 items={실패둘} env="stage" 된다 />);

    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));

    expect(await screen.findByRole('dialog', { name: '실행할 케이스 2건' })).toBeTruthy();
    expect(읽기.mock.calls.map(([id]) => id)).toEqual(['ZRS-001', 'ZRS-002']);
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('stage');
  });

  it('창의 취소를 누르면 창이 닫힌다', async () => {
    vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve(케이스(tcId)));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    render(<실패다시실행 items={실패둘} env="qa" 된다 />);
    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
