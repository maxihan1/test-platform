// @vitest-environment jsdom
// 「PRD 관리」 요구 줄의 추적표 칸 · 편 줄 테스트 구획 · 추적표 엑셀 버튼을 본다
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError, type LastResult } from './api.js';
import { Prd } from './Prd.js';
import { 판 } from './prd.fixture.js';
import type { PrdNow } from './prdApi.js';
import type { 판정 } from './role.js';

const { 지금, 엑셀 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<PrdNow> => Promise.reject(new Error('판을 정하지 않았다'))),
  엑셀: vi.fn((_s: string): Promise<{ 파일: Blob; 머리: string | null }> => Promise.reject(new Error('엑셀을 정하지 않았다'))),
}));

vi.mock('./prdApi.js', () => ({ prdApi: { now: 지금, rtmExport: 엑셀, apis: () => Promise.resolve({ apis: [] }) } }));

const 보는사람: 판정 = () => false;

const 덮음 = (tcId: string, axis: string, techniques: string[] = [], platforms: ('desktop' | 'mobile')[] = ['desktop']) => ({
  tcId,
  axis,
  techniques,
  platforms,
});

const 결과 = (tcId: string, platform: 'desktop' | 'mobile', status: LastResult['status']): LastResult => ({
  tcId,
  platform,
  status,
  historyId: 1,
  runId: 1,
  durationMs: 100,
  finishedAt: '2026-10-11T01:00:00Z',
  recent: [status],
});

// 아이디(MKT-REQ-031)는 기능 둘 · UI 하나, 아이디 칸(MKT-REQ-032)은 아무도 안 덮는다
const 덮인판 = () =>
  판({
    cases: {
      'MKT-REQ-031': [
        덮음('MKT-FN-001', '정상', ['동등 분할']),
        덮음('MKT-FN-002', '경계', ['경계값 분석', '동등 분할'], ['desktop', 'mobile']),
        덮음('MKT-UI-001', 'UI'),
      ],
      'MKT-REQ-040': [덮음('MKT-FN-010', '예외')],
      'MKT-REQ-041': [덮음('MKT-FN-011', '정상')],
    },
  });

beforeEach(() => {
  지금.mockReset();
  지금.mockResolvedValue(덮인판());
  엑셀.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 줄of = (reqId: string) => screen.getByRole('button', { name: new RegExp(reqId) }).closest('.prd-line') as HTMLElement;

describe('PRD 관리 — 요구사항 추적표 칸', () => {
  it('요구마다 기능 · UI 건수 고리 · 마지막 결과를 달고, 테스트가 없으면 「미작성」이다', async () => {
    const 부름 = vi.spyOn(api, 'lastByCase').mockResolvedValue({
      items: [
        결과('MKT-FN-001', 'desktop', 'PASS'),
        결과('MKT-FN-002', 'desktop', 'PASS'),
        결과('MKT-FN-002', 'mobile', 'FAIL'),
        결과('MKT-UI-001', 'desktop', 'PASS'),
        결과('MKT-FN-010', 'desktop', 'PASS'),
      ],
    });
    render(<Prd service="MKT" 할수={보는사람} 결과보나 케이스보나 />);
    const 회원가입 = await screen.findByRole('button', { name: /회원가입/ });
    await vi.waitFor(() => expect(회원가입.textContent).toContain('미작성 1건 · 실패 1건'));
    expect(부름).toHaveBeenCalledOnce();
    fireEvent.click(회원가입);

    const 아이디 = 줄of('MKT-REQ-031');
    expect(within(아이디).getByRole('link', { name: '기능 2건' }).getAttribute('href')).toBe('#/cases/fn/req/MKT-REQ-031');
    expect(within(아이디).getByRole('link', { name: 'UI 1건' }).getAttribute('href')).toBe('#/cases/ui/req/MKT-REQ-031');
    // 기기 한쪽만 깨져도 그 케이스는 실패다 — 케이스 목록과 같은 규칙
    expect(within(아이디).getByText('실패 1 / 3').className).toBe('verdict v-fail');
    // 실패 숫자를 누르면 실패한 케이스만 거른 목록이 열린다 (점검 8.7)
    expect(within(아이디).getByText('실패 1 / 3').getAttribute('href')).toBe('#/cases/fn/req/MKT-REQ-031?last=FAIL');
    expect(within(줄of('MKT-REQ-032')).getByText('미작성')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
    expect(within(줄of('MKT-REQ-040')).getByText('통과').className).toBe('verdict v-pass');
    expect(within(줄of('MKT-REQ-041')).getByText('미실행').className).toBe('verdict v-na');
  });

  it('실패가 UI 케이스에만 있으면 실패 숫자가 UI 목록으로 연다 (점검 8.7)', async () => {
    vi.spyOn(api, 'lastByCase').mockResolvedValue({
      items: [결과('MKT-FN-001', 'desktop', 'PASS'), 결과('MKT-FN-002', 'desktop', 'PASS'), 결과('MKT-UI-001', 'desktop', 'FAIL')],
    });
    render(<Prd service="MKT" 할수={보는사람} 결과보나 케이스보나 />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    const 아이디 = 줄of('MKT-REQ-031');
    await vi.waitFor(() => expect(within(아이디).getByText('실패 1 / 3').getAttribute('href')).toBe('#/cases/ui/req/MKT-REQ-031?last=FAIL'));
  });

  it('기능 · UI 양쪽에 실패가 있으면 UI 쪽 고리를 하나 더 단다', async () => {
    vi.spyOn(api, 'lastByCase').mockResolvedValue({
      items: [결과('MKT-FN-001', 'desktop', 'FAIL'), 결과('MKT-FN-002', 'desktop', 'PASS'), 결과('MKT-UI-001', 'desktop', 'FAIL')],
    });
    render(<Prd service="MKT" 할수={보는사람} 결과보나 케이스보나 />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    const 아이디 = 줄of('MKT-REQ-031');
    await vi.waitFor(() => expect(within(아이디).getByText('실패 2 / 3').getAttribute('href')).toBe('#/cases/fn/req/MKT-REQ-031?last=FAIL'));
    expect(within(아이디).getByText('UI 실패 1건 보기').getAttribute('href')).toBe('#/cases/ui/req/MKT-REQ-031?last=FAIL');
  });

  it('케이스 read 가 없으면 실패 숫자도 고리가 아니다', async () => {
    vi.spyOn(api, 'lastByCase').mockResolvedValue({ items: [결과('MKT-FN-001', 'desktop', 'FAIL')] });
    render(<Prd service="MKT" 할수={보는사람} 결과보나 />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    const 아이디 = 줄of('MKT-REQ-031');
    await vi.waitFor(() => expect(within(아이디).getByText(/^실패 \d+ \/ 3$/).tagName).toBe('SPAN'));
  });

  it('줄을 펴면 종류 · 기법 숫자를 설계 미리보기 앞에 보인다', async () => {
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /MKT-REQ-031/ }));
    const 구획 = screen.getByRole('heading', { name: '테스트' }).closest('section') as HTMLElement;
    expect([...구획.querySelectorAll('.prd-kv span')].map((x) => x.textContent)).toEqual([
      '정상 1',
      '경계 1',
      '예외 0',
      'UI 1',
      '경계값 분석 1',
      '동등 분할 2',
    ]);
    expect(구획.nextElementSibling?.querySelector('h3')?.textContent).toBe('출처');
  });

  it('실행 read 가 없으면 결과를 부르지 않고, 케이스 read 가 없으면 건수가 글자뿐이다', async () => {
    const 부름 = vi.spyOn(api, 'lastByCase');
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    const 아이디 = 줄of('MKT-REQ-031');
    expect(within(아이디).getByText('기능 2건').tagName).toBe('SPAN');
    expect(within(아이디).queryByRole('link')).toBeNull();
    expect(아이디.querySelector('.verdict')).toBeNull();
    expect(부름).not.toHaveBeenCalled();
  });

  it('마지막 결과를 못 읽으면 결과 칸을 비우고 그 까닭을 알린다', async () => {
    vi.spyOn(api, 'lastByCase').mockRejectedValue(new ApiError(500, 'INTERNAL', 'DB 연결이 끊겼습니다'));
    render(<Prd service="MKT" 할수={보는사람} 결과보나 케이스보나 />);
    expect(await screen.findByText(/^마지막 결과를 못 읽었습니다 — /)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /회원가입/ }));
    expect(줄of('MKT-REQ-031').querySelector('.verdict')).toBeNull();
  });

  it('성능 목표가 있는 요구는 개수와 최근 판정을, 목표가 없는 요구는 아무것도 안 단다', async () => {
    지금.mockResolvedValue(
      판({
        cases: 덮인판().cases,
        perf: {
          'MKT-REQ-031': { targets: 2, verdict: 'FAIL', runId: 12 },
          'MKT-REQ-040': { targets: 1, verdict: null, runId: null },
          'MKT-REQ-041': { targets: 1, verdict: 'PASS', runId: 9 },
        },
      }),
    );
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /회원가입/ }));
    fireEvent.click(screen.getByRole('button', { name: /^로그인/ }));

    const 아이디 = 줄of('MKT-REQ-031');
    const 실패 = within(아이디).getByText('실패', { selector: '.prd-perf *' });
    expect(아이디.querySelector('.prd-perf')!.textContent).toContain('성능 목표 2개');
    expect(실패.tagName).toBe('A');
    expect(실패.getAttribute('href')).toBe('#/perf/runs/12');
    expect(실패.className).toContain('v-fail');

    const 미실행 = 줄of('MKT-REQ-040').querySelector('.prd-perf .verdict')!;
    expect(미실행.textContent).toBe('미실행');
    expect(미실행.tagName).toBe('SPAN');

    expect(줄of('MKT-REQ-041').querySelector('.prd-perf a')!.className).toContain('v-pass');
    expect(줄of('MKT-REQ-032').querySelector('.prd-perf')).toBeNull();
  });

  it('추적표 엑셀은 보기 권한으로 받고 서버가 준 이름으로 저장한다', async () => {
    엑셀.mockResolvedValue({ 파일: new Blob(['x']), 머리: 'attachment; filename="MKT-RTM-v12-2026-10-11.xlsx"' });
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:rtm'), revokeObjectURL: vi.fn() });
    const 누름 = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<Prd service="MKT" 할수={보는사람} />);
    fireEvent.click(await screen.findByRole('button', { name: /^내려받기/ }));
    fireEvent.click(screen.getByRole('button', { name: '추적표 엑셀로 내려받기' }));
    expect(엑셀).toHaveBeenCalledWith('MKT');
    await vi.waitFor(() => expect(누름).toHaveBeenCalledOnce());
    expect((누름.mock.contexts[0] as HTMLAnchorElement).download).toBe('MKT-RTM-v12-2026-10-11.xlsx');
  });
});
