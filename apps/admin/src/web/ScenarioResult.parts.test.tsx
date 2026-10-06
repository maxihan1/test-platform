// @vitest-environment jsdom
// E2E 실행 결과 화면 검사 ② — 단계 줄 (도메인/시나리오 §8.11 · 실행 §8.7)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { 사진길, 부품, 모킹켜기, 결제, 안돈, 결과, 연다, 줄 } from './ScenarioResult.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('단계 줄', () => {
  it('종류 칩 · 이름 · 미확정 · 단독 실행 · 안 돈 단계', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(within(줄('XSX-001')).getByText('케이스')).toBeTruthy();
    expect(within(줄('XSX-001')).getByText('단독 실행').className).toContain('tech-tag');
    expect(within(줄('XSX-003')).queryByText('단독 실행')).toBeNull();
    expect(within(줄('XSX-003')).getAllByText('미확정').some((el) => el.className.includes('case-tag'))).toBe(true);
    const 모킹 = screen.getByText('모킹 켜기').closest('.scn-part') as HTMLElement;
    expect(within(모킹).getByText('적용됨').className).toContain('tech-tag');
    const api = screen.getByText('API 호출').closest('.scn-part') as HTMLElement;
    expect(within(api).getByText('GET /api/orders → 200')).toBeTruthy();
    expect(within(api).getByText('– 실행 안 됨')).toBeTruthy();
    expect(api.querySelector('.verdict')).toBeNull();
  });

  it('모킹 구간 안 줄에 안내 문장', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(within(줄('XSX-003')).getByText('모킹이 적용된 상태로 실행했습니다 — **/api/pay')).toBeTruthy();
    expect(screen.queryAllByText(/모킹이 적용된 상태로/).length).toBe(1);
  });

  it('모킹 구간 안 API 호출 단계는 모킹되지 않음 — 케이스 단계는 모킹이 적용된 안내 그대로', async () => {
    const 호출 = 부품(4, {
      kind: 'api', tcId: null, tcName: null,
      part: { kind: 'api', method: 'GET', path: '/api/orders', expectStatus: 200 },
      mocks: ['**/api/pay'],
    });
    연다(결과({ parts: [모킹켜기, 결제, 호출] }));
    await screen.findByText('단계별 결과');
    const api = screen.getByText('API 호출').closest('.scn-part') as HTMLElement;
    expect(within(api).getByText('모킹되지 않음').className).toContain('tech-tag');
    expect(within(api).getByText('이 단계의 API 호출은 모킹되지 않습니다')).toBeTruthy();
    expect(within(api).queryByText(/모킹이 적용된 상태로/)).toBeNull();
    expect(api.className).toContain('mocked');
    expect(within(줄('XSX-003')).getByText('모킹이 적용된 상태로 실행했습니다 — **/api/pay')).toBeTruthy();
    expect(within(줄('XSX-003')).queryByText('모킹되지 않음')).toBeNull();
  });

  it('판정 없음 단계는 받은 사유 글자를 보이고 안 돈 단계는 실행 안 됨만', async () => {
    const 멈춤 = 부품(5, { status: 'NA', error: { message: '러너가 이 부품 결과를 돌려주지 않았다' } });
    연다(결과({ parts: [멈춤, 안돈] }));
    await screen.findByText('단계별 결과');
    const 멈춘줄 = 줄('XSX-005');
    expect(within(멈춘줄).getByText('실행이 멈춘 사유')).toBeTruthy();
    expect(within(멈춘줄).getByText('러너가 이 부품 결과를 돌려주지 않았다').className).not.toContain('scn-error');
    const api = screen.getByText('API 호출').closest('.scn-part') as HTMLElement;
    expect(within(api).getByText('– 실행 안 됨')).toBeTruthy();
    expect(api.textContent).not.toContain('NOT_RUN');
    expect(within(api).queryByText('실행이 멈춘 사유')).toBeNull();
  });

  it('입력값은 비밀을 가린다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 글 = 줄('XSX-001').textContent ?? '';
    expect(글).toContain('아이디 kim');
    expect(글).toContain('비밀번호 ********');
    expect(글).not.toContain('hunter2');
  });

  it('건너뜀 · 값 연결 · 정리 · 미확정 사유 · 오류', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 결제줄 = 줄('XSX-003');
    expect(within(결제줄).getByText('준비 「로그인」 — 1번에서 이미 실행')).toBeTruthy();
    expect(within(결제줄).getByText('값 주입')).toBeTruthy();
    expect(within(결제줄).getByText(/orderId ← .* = 812/)).toBeTruthy();
    expect(within(결제줄).getByText('마지막에 실행 DELETE /api/orders/812 → 204')).toBeTruthy();
    expect(within(결제줄).getByText('마지막에 실행 DELETE /api/x — ECONNRESET')).toBeTruthy();
    expect(within(결제줄).getByText('화면에서 읽은 값입니다')).toBeTruthy();
    const 오류 = within(결제줄).getByText(/기대와 다릅니다/);
    expect(오류.textContent).toBe('기대와 다릅니다\n둘째 줄');
  });

  it('절차는 접혀 있고 실패 단계만 처음부터 펼쳐진다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 통과버튼 = within(줄('XSX-001')).getByRole('button', { name: '절차 1' });
    expect(통과버튼.getAttribute('aria-expanded')).toBe('false');
    expect(within(줄('XSX-001')).queryByText('로그인')).toBeNull();
    fireEvent.click(통과버튼);
    expect(통과버튼.getAttribute('aria-expanded')).toBe('true');
    expect(within(줄('XSX-001')).getByText('로그인')).toBeTruthy();

    const 실패버튼 = within(줄('XSX-003')).getByRole('button', { name: '절차 2' });
    expect(실패버튼.getAttribute('aria-expanded')).toBe('true');
    expect(within(줄('XSX-003')).getByText('결제 버튼 누르기')).toBeTruthy();
  });

  it('실패 절차에만 실패 화면 고리 — 시나리오 전체 순번으로 간다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    const 고리 = screen.getAllByRole('link', { name: '실패 화면 보기' });
    expect(고리.length).toBe(1);
    expect(고리[0]?.getAttribute('href')).toBe(사진길(5));
    expect(고리[0]?.getAttribute('target')).toBe('_blank');
    expect(고리[0]?.getAttribute('rel')).toBe('noreferrer');
  });
});
