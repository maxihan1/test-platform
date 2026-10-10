// @vitest-environment jsdom
// E2E 실행 결과 화면 검사 ① — 머리 · 정보 칸 · 도는 중 (도메인/시나리오 §8.11 · 실행 §8.7)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioResult } from './ScenarioResult.js';
import { 부품, 로그인, 안돈, 결과, 연다 } from './ScenarioResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('머리', () => {
  it('제목 · 부제 · 시나리오 고리 · 뒤로 고리', async () => {
    연다(결과());
    expect((await screen.findByRole('heading', { name: '결제 시나리오' })).textContent).toBe('결제 시나리오');
    expect(screen.getByText('E2E · 시나리오 v3 · PC')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'SC-12' }).getAttribute('href')).toBe('#/scenarios/12');
    expect(screen.getByRole('link', { name: '← 실행 기록 › E2E' }).getAttribute('href')).toBe('#/runs/e2e');
  });

  it('상자 안에서는 뒤로 고리가 없다', async () => {
    연다(결과(), true);
    await screen.findByText('단계별 결과');
    expect(screen.queryByRole('link', { name: '← 실행 기록 › E2E' })).toBeNull();
  });

  it('실패는 판정 배지 · 증적 버튼은 없다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('실패');
    expect(screen.queryByText('E2E 증적 받기')).toBeNull();
  });

  it('통과인데 미확정이 섞이면 통과 배지에 미확정 꼬리표만 곁들인다', async () => {
    연다(결과({ parts: [부품(1, { unconfirmed: '사유' })] }));
    await screen.findByText('단계별 결과');
    const 칩 = document.querySelector('.head .case-tag');
    expect(칩?.textContent).toBe('미확정');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('통과');
  });

  it('도는 중이어도 미확정 단계가 있으면 머리에 미확정 꼬리표가 뜬다', async () => {
    연다(결과({ status: 'RUNNING', finishedAt: null, parts: [부품(1, { unconfirmed: '사유' }), 안돈] }));
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')).toBeNull();
    expect(document.querySelector('.head .case-tag')?.textContent).toBe('미확정');
  });

  it('값 주입 줄은 비밀 칸에 꽂힌 값을 서버가 안 가려 보내도 화면이 가린다', async () => {
    const 비밀주입 = 부품(1, {
      part: {
        kind: 'case', tcId: 'XSX-001', params: {}, expected: {}, skipSteps: [],
        links: [{ kind: 'bind', param: 'password', value: { fromSeq: 1, method: 'POST', urlPattern: '**/token', jsonPath: '$.pw' } }],
      },
      paramSchema: { type: 'object', properties: { password: { description: '비밀번호', secret: true } } },
      bound: { password: 'hunter2' },
    });
    연다(결과({ parts: [비밀주입] }));
    await screen.findByText('단계별 결과');
    expect(document.body.textContent).not.toContain('hunter2');
    expect(screen.getByText(/password ← 1번 POST \*\*\/token 응답의 \$\.pw = \*+/)).toBeTruthy();
  });

  it('실패 머리는 미확정 단계가 있을 때만 미확정 꼬리표를 곁들인다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('실패');
    expect(document.querySelector('.head .case-tag')?.textContent).toBe('미확정');
    cleanup();
    연다(결과({ parts: [부품(1, { status: 'FAIL', error: { message: '깨짐' } })] }));
    await screen.findByText('단계별 결과');
    expect(document.querySelector('.head .verdict')?.textContent).toBe('실패');
    expect(document.querySelector('.head .case-tag')).toBeNull();
  });

  it('정보 칸 다섯', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 칸 = document.querySelector('.scn-info') as HTMLElement;
    for (const 라벨 of ['실행 시각', '소요', '대상 서버', '대상 주소', '실행자']) expect(within(칸).getByText(라벨)).toBeTruthy();
    for (const 값 of ['qa', 'https://qa.example.com', '김검사', '12.00초']) expect(within(칸).getByText(값)).toBeTruthy();
  });
});

describe('도는 중 아직 안 돈 단계', () => {
  const 대기중 = 부품(2, {
    kind: 'api', tcId: null, tcName: null,
    part: { kind: 'api', method: 'GET', path: '/api/orders', expectStatus: 200 },
    status: 'NA', durationMs: null, error: null,
  });

  it('도는 동안은 판정 글자를 비운다', async () => {
    연다(결과({ status: 'RUNNING', finishedAt: null, parts: [로그인, 대기중, 안돈] }));
    await screen.findByText('단계별 결과');

    const 줄들 = document.querySelectorAll('.scn-part');
    expect(줄들).toHaveLength(3);
    for (const 줄 of [줄들[1]!, 줄들[2]!]) {
      expect(줄.querySelector('.verdict')).toBeNull();
      expect(줄.textContent).not.toContain('미실행');
      expect(줄.textContent).not.toContain('– 실행 안 됨');
    }
    expect(줄들[0]!.querySelector('.verdict')?.textContent).toBe('통과');
  });

  it('끝난 뒤 NOT_RUN 은 – 실행 안 됨을 보인다', async () => {
    연다(결과({ parts: [로그인, 안돈] }));
    await screen.findByText('단계별 결과');

    expect(screen.getByText('– 실행 안 됨')).toBeTruthy();
  });
});

describe('도는 중', () => {
  it('안내 문장을 보이고 2초마다 다시 묻다가 끝나면 멈춘다', async () => {
    vi.useFakeTimers();
    const 부름 = vi
      .spyOn(scenarioApi, 'result')
      .mockResolvedValueOnce(결과({ status: 'RUNNING', finishedAt: null, parts: [안돈] }))
      .mockResolvedValue(결과());
    render(<ScenarioResult runId={77} />);
    await act(async () => {});
    expect(screen.getByRole('status').textContent).toBe('실행 중입니다. 끝나면 결과가 채워집니다');
    expect(document.querySelector('.head .verdict')).toBeNull();
    expect(부름).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(부름).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('status')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(부름).toHaveBeenCalledTimes(2);
  });
});
