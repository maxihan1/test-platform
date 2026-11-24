// @vitest-environment jsdom
// 실행 창이 테스트 프로시저를 통째로 보이는 검사 — 안내 한 줄 · 헤더 줄 · 차례 번호 · 자동 포함 꼬리표 · 실제 실행 건수 (도메인/실행 §8.10 · DESIGN.md 「실행 창」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type CaseRow, type ServiceRow } from './api.js';
import { RunPickModal } from './RunPickModal.js';
import { 시작누름 } from './runPick.fixture.js';
import type { 담은줄 } from './pickProc.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const 케이스 = (tcId: string, procId: string | null, procSeq: number | null, 자동 = false): 담은줄 => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['android'],
  precondition: [],
  filePath: `tests/${tcId}.spec.ts`,
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-11-24T00:00:00.000Z',
  procId,
  procSeq,
  procName: procId === null ? null : '글쓰기 — 화면 구성부터 게시까지',
  procCount: procId === null ? null : 3,
  ...(자동 ? { 자동포함: true } : {}),
});

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'MTA',
  name: 'Mastodon Android 앱',
  color: '#123456',
  projectId: 1,
  projectName: 'Mastodon',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: true,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 프로시저: CaseRow[] = [케이스('MTA-1', 'MTA-TP-021', 1, true), 케이스('MTA-2', 'MTA-TP-021', 2), 케이스('MTA-3', 'MTA-TP-021', 3, true)];

function 그리기(케이스들: 담은줄[] = 프로시저) {
  const onRun = vi.fn();
  render(<RunPickModal 케이스들={케이스들} service={서비스} onRun={onRun} onClose={vi.fn()} />);
  return { onRun };
}

describe('실행 창의 테스트 프로시저', () => {
  it('안내 한 줄에 선택 건수와 자동 포함 건수가 선다', () => {
    그리기();
    expect(document.querySelector('.proc-note')?.textContent).toBe('테스트 프로시저는 케이스 전체를 실행합니다 · 선택 1건 · 자동 포함 2건 · 결과는 케이스마다 남습니다');
  });

  it('자동 포함이 없으면 그 조각을 빼고 안내한다', () => {
    그리기(프로시저.map((c) => ({ ...c, 자동포함: false })));
    expect(document.querySelector('.proc-note')?.textContent).toBe('테스트 프로시저는 케이스 전체를 실행합니다 · 결과는 케이스마다 남습니다');
  });

  it('프로시저 케이스가 없으면 안내를 그리지 않는다', () => {
    그리기([케이스('MTA-7', null, null)]);
    expect(document.querySelector('.proc-note')).toBeNull();
    expect(document.querySelector('.prow-proc')).toBeNull();
  });

  it('프로시저 헤더가 번호 · 이름 · 케이스 수로 서고 케이스 줄에 차례 번호가 선다', () => {
    그리기();
    const 헤더 = document.querySelector('.prow-proc');
    expect(헤더?.textContent).toContain('MTA-TP-021');
    expect(헤더?.textContent).toContain('글쓰기 — 화면 구성부터 게시까지');
    expect(헤더?.textContent).toContain('케이스 3건');
    expect([...document.querySelectorAll('.proc-seq')].map((칸) => 칸.textContent)).toEqual(['1', '2', '3']);
  });

  it('선택하지 않은 줄만 「자동 포함」 꼬리표가 달리고 흐려지며, 입력 칸이 있는 자동 포함 줄의 입력값 열은 저장값이고 없는 줄은 없음이다', () => {
    const 계정칸 = { type: 'object', properties: { loginId: { type: 'string', description: '일반 회원 아이디' } } };
    그리기([{ ...프로시저[0]!, paramSchema: 계정칸 }, 프로시저[1]!, { ...프로시저[2]!, paramSchema: 계정칸 }]);
    const 줄들 = [...document.querySelectorAll('.prow:not(.prow-proc):not(.prow-head)')];
    expect(줄들.map((줄) => 줄.classList.contains('prow-with'))).toEqual([true, false, true]);
    expect([...document.querySelectorAll('.case-tag')].map((칸) => 칸.textContent)).toEqual(['자동 포함', '자동 포함']);
    expect(줄들.map((줄) => 줄.querySelector('.iv')?.textContent)).toEqual(['저장값', '없음', '저장값']);
    cleanup();
    그리기();
    expect([...document.querySelectorAll('.prow-with .iv')].map((칸) => 칸.textContent)).toEqual(['없음', '없음']);
  });

  it('제목과 디바이스 칩의 건수는 자동 포함까지 센 실제 실행 수다', () => {
    그리기();
    expect(screen.getByText('케이스 3건 실행')).toBeTruthy();
    expect(screen.getByText('Android 앱 3건')).toBeTruthy();
  });

  it('요청에는 고른 케이스만 싣고 자동 포함 줄은 서버가 펼치게 둔다', () => {
    const { onRun } = 그리기();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    시작누름();
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ items: [{ tcId: 'MTA-2', platforms: ['android'], params: {}, expected: {} }] }));
  });

  it('같은 프로시저의 케이스를 여럿 걸어도 한 건이라 붙을 실행을 읽는다', async () => {
    const 읽기 = vi.spyOn(api, 'rerunTarget').mockResolvedValue({ target: null });
    그리기();
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect(await screen.findByText('이 케이스만 따로 실행해 케이스 상세의 실행 기록에만 남습니다')).toBeTruthy();
    expect(읽기).toHaveBeenCalledWith('MTA-2', 'qa', ['android'], 'server');
  });

  it('프로시저가 둘이면 한 건이 아니라 새 RUN 으로 남는다고 적는다', async () => {
    const 읽기 = vi.spyOn(api, 'rerunTarget');
    그리기([케이스('MTA-1', 'MTA-TP-021', 1), 케이스('MTA-8', 'MTA-TP-022', 1)]);
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    expect(await screen.findByText('완료되면 실행 기록에 새 RUN 으로 남고 리포트가 만들어집니다')).toBeTruthy();
    expect(읽기).not.toHaveBeenCalled();
  });

  it('시험 실행은 같은 프로시저를 한 번만 걸고 줄마다 결과가 찬다', async () => {
    const 시작 = vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockResolvedValue({
      status: 'DONE',
      result: { status: 'PASS', durationMs: 1000, steps: [] },
      results: [1, 2, 3].map((n) => ({ tcId: `MTA-${String(n)}`, status: n === 3 ? 'FAIL' : 'PASS', durationMs: 1000, steps: [] })),
    } as Awaited<ReturnType<typeof api.getTrial>>);
    그리기();

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');

    expect(await screen.findByText('시험 실행 결과')).toBeTruthy();
    expect(시작).toHaveBeenCalledTimes(1);
    expect(시작.mock.calls[0]?.[0]).toBe('MTA-2');
    expect(screen.getByText('MTA-3')).toBeTruthy();
  });
});

