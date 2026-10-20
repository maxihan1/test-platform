// @vitest-environment jsdom
// E2E 실행 결과의 다음 할 일 — 실패 안내 줄 · 단계 수정 · 다시 실행 · 돌아갈 곳 (도메인/시나리오 §8.11 「실행 결과」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioResult } from './ScenarioResult.js';
import { 멈춘단계 } from './ScenarioResultNext.js';
import { 부품, 로그인, 결제, 안돈, 결과, 연다 } from './ScenarioResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('멈춘단계', () => {
  it('실패한 첫 단계, 없으면 판정 없음인 첫 단계, 다 통과면 없다', () => {
    expect(멈춘단계([로그인, 결제, 안돈])?.seq).toBe(3);
    expect(멈춘단계([로그인, { ...안돈, error: { message: '단계 제한 시간 300000ms 를 넘었다' } }])?.seq).toBe(4);
    expect(멈춘단계([로그인])).toBeNull();
  });

  it('앞 단계 때문에 안 돈 단계 · 서버 재시작으로 닫힌 단계만 있으면 고칠 단계가 없다', () => {
    expect(멈춘단계([로그인, 안돈])).toBeNull();
    expect(멈춘단계([로그인, { ...안돈, error: { message: 'ABORTED' } }])).toBeNull();
    expect(멈춘단계([로그인, { ...안돈, error: null }])).toBeNull();
  });
});

describe('실패 안내 줄', () => {
  it('멈춘 단계 이름 · 실패 유형 · 한 줄과 그 단계 수정 고리가 선다', async () => {
    연다(결과({ parts: [로그인, { ...결제, failure: { type: 'mismatch', reason: '기대 0 · 실제 1' } }, 안돈] }));
    expect(await screen.findByText('3번 단계 「결제 확인」에서 실패했습니다')).toBeTruthy();
    expect(screen.getByText(/기대 결과 불일치 · 기대 0 · 실제 1/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '3번 단계 수정' }).getAttribute('href')).toBe('#/scenarios/12?step=3');
  });

  it('다시 실행은 같은 서버로 걸고 새 결과로 옮긴다. 머리에는 같은 단추를 또 두지 않는다', async () => {
    연다(결과());
    const run = vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 88 });
    const 단추들 = await screen.findAllByRole('button', { name: 'qa에서 다시 실행' });
    expect(단추들).toHaveLength(1);
    fireEvent.click(단추들[0]!);
    await waitFor(() => expect(window.location.hash).toBe('#/runs/88'));
    expect(run).toHaveBeenCalledWith(12, 'qa');
  });

  it('실행 기록 결과 칸에서 다시 실행하면 주소를 옮기지 않고 새 실행 번호를 넘긴다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 90 });
    const 받음 = vi.fn();
    window.location.hash = '#/runs/e2e';
    render(<ScenarioResult runId={77} 판정하기={() => () => true} 칸안 on새실행={받음} />);
    fireEvent.click(await screen.findByRole('button', { name: 'qa에서 다시 실행' }));
    await waitFor(() => expect(받음).toHaveBeenCalledWith(90));
    expect(window.location.hash).toBe('#/runs/e2e');
  });

  it('통과한 결과는 안내 줄 없이 머리에 다시 실행만 있다', async () => {
    연다(결과({ parts: [로그인, 부품(2, {})] }));
    expect(await screen.findByRole('button', { name: 'qa에서 다시 실행' })).toBeTruthy();
    expect(document.querySelector('.scn-fail-guide')).toBeNull();
  });

  it('실행 권한이 없으면 수정 · 다시 실행이 없다', async () => {
    vi.spyOn(scenarioApi, 'result').mockResolvedValue(결과());
    render(<ScenarioResult runId={77} 판정하기={() => () => false} />);
    expect(await screen.findByText('3번 단계 「결제 확인」에서 실패했습니다')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '3번 단계 수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'qa에서 다시 실행' })).toBeNull();
  });
});

describe('돌아갈 곳', () => {
  it('목록에서 오면 E2E 시나리오, 조립 화면에서 오면 그 시나리오로 돌아간다', async () => {
    window.location.hash = '#/runs/77?from=scenarios';
    연다(결과());
    expect((await screen.findByRole('link', { name: '← E2E 시나리오' })).getAttribute('href')).toBe('#/scenarios');
    cleanup();
    window.location.hash = '#/runs/77?from=scenario';
    연다(결과());
    expect((await screen.findByRole('link', { name: '← SC-12 시나리오' })).getAttribute('href')).toBe('#/scenarios/12');
  });

  it('다시 실행해도 들어온 곳을 이어 간다', async () => {
    window.location.hash = '#/runs/77?from=scenarios';
    연다(결과());
    vi.spyOn(scenarioApi, 'run').mockResolvedValue({ runId: 89 });
    fireEvent.click(await screen.findByRole('button', { name: 'qa에서 다시 실행' }));
    await waitFor(() => expect(window.location.hash).toBe('#/runs/89?from=scenarios'));
  });
});
