// @vitest-environment jsdom
// 실행 결과 머리의 「실패 N건 다시 실행」 (도메인/실행 §8.3 · §8.10)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type CaseRow, type ItemStatus, type Platform, type RunItemSummary } from './api.js';
import { 실패다시실행, 실패디바이스, 실패케이스들 } from './RerunFailed.js';
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

describe('실패디바이스', () => {
  it('케이스마다 실패한 디바이스만, 중복 없이 모은다', () => {
    const items = [
      항목('ZRS-001', 'PASS', 'desktop'),
      항목('ZRS-001', 'FAIL', 'mobile'),
      항목('ZRS-001', 'FAIL', 'mobile'),
      항목('ZRS-002', 'FAIL', 'desktop'),
      항목('ZRS-002', 'FAIL', 'mobile'),
      항목('ZRS-003', 'NA', 'desktop'),
    ];

    expect(실패디바이스(items)).toEqual({ 'ZRS-001': ['mobile'], 'ZRS-002': ['desktop', 'mobile'] });
  });
});

describe('실패다시실행', () => {
  const 실패둘 = [항목('ZRS-001', 'FAIL'), 항목('ZRS-001', 'FAIL', 'mobile'), 항목('ZRS-002', 'FAIL'), 항목('ZRS-003', 'PASS')];

  it('버튼 글자에 중복을 뺀 실패 케이스 건수가 든다', () => {
    render(<실패다시실행 runId={20914} items={실패둘} env="qa" 된다 />);

    expect(screen.getByRole('button', { name: '실패 2건 다시 실행' })).toBeTruthy();
  });

  it('실행 권한이 없으면(된다=false) 버튼이 없다', () => {
    render(<실패다시실행 runId={20914} items={실패둘} env="qa" 된다={false} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('실패가 하나도 없으면 버튼이 없다', () => {
    render(<실패다시실행 runId={20914} items={[항목('ZRS-001', 'PASS')]} env="qa" 된다 />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('누르면 실패한 케이스만 담은 창이 그 실행의 서버가 골라진 채로 열린다', async () => {
    const 읽기 = vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve(케이스(tcId)));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    render(<실패다시실행 runId={20914} items={실패둘} env="stage" 된다 />);

    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));

    expect(await screen.findByRole('dialog', { name: '실행할 케이스 2건' })).toBeTruthy();
    expect(읽기.mock.calls.map(([id]) => id)).toEqual(['ZRS-001', 'ZRS-002']);
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('stage');
  });

  it('걸면 원래 실행 번호를 실어 보낸다 — 서버가 「RUN N의 실패 M건 다시」로 제목을 짓는다 (도메인/실행 §7)', async () => {
    vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve(케이스(tcId)));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    const 만들기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 20915 });
    const on걸었다 = vi.fn();
    render(<실패다시실행 runId={20914} items={실패둘} env="stage" 된다 on걸었다={on걸었다} />);
    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    await waitFor(() => expect(on걸었다).toHaveBeenCalledWith(20915));
    expect(만들기.mock.calls[0]?.[0]).toMatchObject({ rerunOf: 20914, env: 'stage' });
  });

  it('창의 취소를 누르면 창이 닫힌다', async () => {
    vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve(케이스(tcId)));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    render(<실패다시실행 runId={20914} items={실패둘} env="qa" 된다 />);
    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('통과한 디바이스는 담지 않는다 — 걸면 실패한 디바이스만 보낸다 (도메인/실행 §8.3 · 점검 2.16)', async () => {
    vi.spyOn(api, 'caseOf').mockImplementation((tcId) => Promise.resolve({ ...케이스(tcId), platforms: ['desktop', 'mobile'] }));
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    const 만들기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 20915 });
    const 일부만 = [항목('ZRS-001', 'PASS', 'desktop'), 항목('ZRS-001', 'FAIL', 'mobile'), 항목('ZRS-002', 'FAIL', 'desktop'), 항목('ZRS-002', 'FAIL', 'mobile')];
    render(<실패다시실행 runId={20914} items={일부만} env="stage" 된다 on걸었다={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: '실행' }));

    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(만들기.mock.calls[0]?.[0].items.map((it) => [it.tcId, it.platforms])).toEqual([
      ['ZRS-001', ['mobile']],
      ['ZRS-002', ['desktop', 'mobile']],
    ]);
  });

  it('그 실행이 시작된 뒤 저장값이 바뀐 케이스는 창 위에 알린다', async () => {
    const 저장 = (savedAt: string) => ({ params: {}, expected: {}, savedSecrets: { params: [], expected: [] }, savedBy: 'kim', savedAt });
    vi.spyOn(api, 'caseOf').mockImplementation((tcId) =>
      Promise.resolve({ ...케이스(tcId), savedInput: 저장(tcId === 'ZRS-001' ? '2026-09-22T00:00:00.000Z' : '2026-09-20T00:00:00.000Z') }),
    );
    vi.spyOn(api, 'me').mockResolvedValue({ user: 사람 });
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    render(<실패다시실행 runId={20914} items={실패둘} env="qa" 시작="2026-09-21T00:00:00.000Z" 된다 />);

    fireEvent.click(screen.getByRole('button', { name: '실패 2건 다시 실행' }));

    expect(await screen.findByText('실행 뒤에 저장값이 바뀐 케이스 ZRS-001 — 실패 때와 다른 값으로 돕니다')).toBeTruthy();
  });
});
