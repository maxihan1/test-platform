// @vitest-environment jsdom
// E2E 시나리오 시험 실행 검사 ① — 시작 전 막기 · 결과 탭 · 왼쪽 요약 (도메인/시나리오 §8.11)

import type { ScenarioExecuteResponse } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { 떠나기막기 } from './leaveGuard.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { 서비스, 사람, 케이스단계, 단계셋, 실패결과, 통과결과, 기존그리기, 서버고르기, 탭 } from './ScenarioTrial.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.location.hash = '';
  sessionStorage.clear();
});

describe('시험 실행 시작 전 막기', () => {
  it('대상 서버를 안 고르면 줄만 띄우고 서버를 안 부르며 버튼은 잠기지 않는다', async () => {
    await 기존그리기();
    const start = vi.spyOn(scenarioApi, 'startTrial');

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('시험 실행할 대상 서버를 먼저 고릅니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: '시험 실행' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('');
  });

  it('대상 서버 고르개의 빈 선택지는 목록 화면처럼 「선택하세요」로 보인다', async () => {
    await 기존그리기();
    const 고르개 = screen.getByLabelText('대상 서버') as HTMLSelectElement;
    expect(고르개.options[0]?.value).toBe('');
    expect(고르개.options[0]?.textContent).toBe('선택하세요');
  });

  it('막힌 뒤 대상 서버를 고르면 먼저 고르라는 줄이 사라진다', async () => {
    await 기존그리기();
    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    expect(screen.getByText('시험 실행할 대상 서버를 먼저 고릅니다')).toBeTruthy();

    서버고르기('stg');

    expect(screen.queryByText('시험 실행할 대상 서버를 먼저 고릅니다')).toBeNull();
  });

  it('가리킴이 빈 값 연결이 있으면 문장을 띄우고 서버를 안 부른다', async () => {
    await 기존그리기([
      케이스단계('ZSB-001'),
      케이스단계('ZSB-002', { links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/x', fromSeq: 0 }] }),
    ]);
    const start = vi.spyOn(scenarioApi, 'startTrial');
    서버고르기('stg');

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('가져올 단계를 다시 골라야 시험 실행할 수 있습니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it('칸에 잘못 적은 곳이 있으면 문장을 띄우고 서버를 안 부른다', async () => {
    await 기존그리기([{ kind: 'wait', ms: 1000 }]);
    const start = vi.spyOn(scenarioApi, 'startTrial');
    서버고르기('stg');
    fireEvent.change(screen.getByLabelText('기다릴 시간(초)'), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('1번 단계의 잘못 적은 칸을 고쳐야 시험 실행할 수 있습니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it('단계가 0개면 문장을 띄우고 서버를 안 부른다', async () => {
    render(<ScenarioBuild id={null} 띠서비스={서비스('ZSB')} user={사람()} />);
    const start = vi.spyOn(scenarioApi, 'startTrial');
    서버고르기('stg');

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));

    expect(screen.getByText('단계를 하나 이상 넣어야 시험 실행할 수 있습니다')).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });

  it('쓰기 권한이 없으면 대상 서버 고르개 · 시험 실행 버튼이 없다', async () => {
    await 기존그리기(단계셋, 사람('read'));

    expect(screen.queryByLabelText('대상 서버')).toBeNull();
    expect(screen.queryByRole('button', { name: '시험 실행' })).toBeNull();
  });
});

describe('시험 결과 탭 · 왼쪽 요약', () => {
  async function 끝낸것(결과: ScenarioExecuteResponse) {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-1', env: 'stg' }));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({ status: 'FINISHED', result: 결과 });
    const 것 = await 기존그리기();
    await screen.findByText(/^시험 실행 · stg/);
    return 것;
  }

  it('안 돌렸으면 요약을 안 그리고 탭에 안내와 한 줄을 둔다', async () => {
    const { container } = await 기존그리기();

    expect(screen.queryByText(/^시험 실행 · /)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: '시험 결과' }));
    expect(탭(container)).toBe('trial');
    const 칸 = within(screen.getByRole('tabpanel'));
    expect(칸.getByText('시험 실행은 기록에 남지 않고 증적도 만들지 않습니다. 저장하지 않은 변경 내용으로도 실행해 볼 수 있습니다')).toBeTruthy();
    expect(칸.getByText('아직 시험 실행을 하지 않았습니다')).toBeTruthy();
  });

  it('요약은 서버 · 초 · 실패한 첫 단계를 보이고 자세히가 시험 결과 탭을 연다', async () => {
    const { container } = await 끝낸것(실패결과);

    expect(screen.getByText('시험 실행 · stg · 3.40초')).toBeTruthy();
    expect(screen.getByText('2번에서 멈춤')).toBeTruthy();
    expect(탭(container)).toBe('settings');

    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    expect(탭(container)).toBe('trial');
  });

  it('시험 결과 줄에 케이스는 번호와 이름이 붙고 다른 단계는 요약이 붙는다', async () => {
    await 끝낸것(실패결과);
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    const 줄들 = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(within(줄들[0]!).getByText('ZSB-001')).toBeTruthy();
    expect(within(줄들[0]!).getByText('ZSB-001 케이스')).toBeTruthy();
    expect(within(줄들[1]!).getByText('ZSB-002')).toBeTruthy();
    expect(within(줄들[1]!).getByText('ZSB-002 케이스')).toBeTruthy();
  });

  it('모킹 단계 줄에는 무늬와 응답 코드 요약이 붙는다', async () => {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-1', env: 'stg' }));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({
      status: 'FINISHED',
      result: { status: 'PASS', durationMs: 900, parts: [{ seq: 1, status: 'PASS', durationMs: 10, steps: [], mocks: [] }] },
    });
    await 기존그리기([{ kind: 'mock', urlPattern: '**/api/**', status: 200, contentType: 'application/json', body: '{}' }]);
    await screen.findByText(/^시험 실행 · stg/);
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    expect(within(screen.getByRole('tabpanel')).getByText('**/api/** → 200')).toBeTruthy();
  });

  it('모킹 켜기 · 끄기 단계는 통과가 아니라 적용됨으로 보인다', async () => {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-1', env: 'stg' }));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({
      status: 'FINISHED',
      result: {
        status: 'PASS',
        durationMs: 900,
        parts: [
          { seq: 1, status: 'PASS', durationMs: 10, steps: [], mocks: [] },
          { seq: 2, status: 'PASS', durationMs: 20, steps: [], mocks: [] },
        ],
      },
    });
    await 기존그리기([
      { kind: 'mock', urlPattern: '**/api/**', status: 200, contentType: 'application/json', body: '{}' },
      { kind: 'unmock', urlPattern: '**/api/**' },
    ]);
    await screen.findByText(/^시험 실행 · stg/);
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    const 줄들 = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(줄들).toHaveLength(2);
    for (const 줄 of 줄들) {
      expect(within(줄).getByText('적용됨')).toBeTruthy();
      expect(within(줄).queryByText('통과')).toBeNull();
    }
  });

  it('시간 초과 같은 NA 결과는 실패 색이 아니라 판정 없음 색으로 칠한다', async () => {
    sessionStorage.setItem('scn-trial:12', JSON.stringify({ trialId: 't-1', env: 'stg' }));
    vi.spyOn(scenarioApi, 'trial').mockResolvedValue({
      status: 'FINISHED',
      result: { status: 'NA', durationMs: 900, parts: [], error: { message: '러너가 거절했습니다' } },
    });
    await 기존그리기();
    await screen.findByText(/^시험 실행 · stg/);

    const 요약문장 = screen.getByText('러너가 거절했습니다');
    expect(요약문장.className).toBe('scn-trial-na');
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));
    const 탭문장 = within(screen.getByRole('tabpanel')).getByText('러너가 거절했습니다');
    expect(탭문장.className).toBe('scn-trial-na');
  });

  it('FAIL 결과의 오류 문장은 실패 색이다', async () => {
    await 끝낸것({ status: 'FAIL', durationMs: 900, parts: [], error: { message: '단계가 실패했습니다' } });

    expect(screen.getByText('단계가 실패했습니다').className).toBe('scn-trial-fail');
  });

  it('모두 통과면 그 글자를 보인다', async () => {
    await 끝낸것(통과결과);

    expect(screen.getByText('모두 통과')).toBeTruthy();
    expect(screen.queryByText(/번에서 멈춤/)).toBeNull();
  });

  it('탭은 단계마다 종류 · 판정 · 소요 · 오류 · 실패 화면 · 안 돈 단계를 보인다', async () => {
    await 끝낸것(실패결과);
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    const 줄들 = within(screen.getByRole('tabpanel')).getAllByRole('listitem');
    expect(줄들).toHaveLength(3);
    expect(within(줄들[0]!).getByText('통과')).toBeTruthy();
    expect(within(줄들[0]!).getByText('케이스')).toBeTruthy();
    expect(within(줄들[0]!).getByText('1.20초')).toBeTruthy();
    expect(within(줄들[1]!).getByText('실패')).toBeTruthy();
    expect(줄들[1]!.querySelector('pre.scn-error')?.textContent).toBe('기대 a\n실제 b');
    const 사진 = within(줄들[1]!).getByRole('link', { name: '실패 화면 보기' });
    expect(사진.getAttribute('href')).toBe(scenarioApi.trialShot('t-1', 5));
    expect(사진.getAttribute('target')).toBe('_blank');
    expect(within(줄들[2]!).getByText('– 실행 안 됨')).toBeTruthy();
    expect(줄들[2]!.querySelector('.verdict')).toBeNull();
  });

  it('안 돈 것이 아닌 NA 는 멈춘 사유 줄을 보이고 전체 오류는 맨 위에 보인다', async () => {
    await 끝낸것({
      status: 'FAIL',
      durationMs: 900,
      parts: [{ seq: 1, status: 'NA', durationMs: 0, steps: [], mocks: [], error: { message: '러너가 멈췄습니다' } }],
      error: { message: 'TIMEOUT' },
    });
    fireEvent.click(screen.getByRole('button', { name: '자세히' }));

    const 칸 = within(screen.getByRole('tabpanel'));
    expect(칸.getByText('실행이 멈춘 사유')).toBeTruthy();
    expect(칸.getByText('러너가 멈췄습니다')).toBeTruthy();
    expect(칸.getByText('TIMEOUT')).toBeTruthy();
  });
});
