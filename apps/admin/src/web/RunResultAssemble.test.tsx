// @vitest-environment jsdom
// 결과 화면 조립 검사 — 요약 띠 · 카드 · 줄 · 옆 칸 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 도는중응답, 실행까지, 증적 } from './RunResult.fixture.js';
import {
  견줌,
  섞인항목,
  앞선가,
  연다,
  첫실행,
  판정칸,
  항목줄,
} from './RunResultAssemble.fixture.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

// 끝난 실행은 요약 띠 → 실패 카드 → 통과 · 미실행 줄이고 옆 칸이 따라온다. 미확정 항목은 제 차례에 꼬리표만 단다 (도메인/실행 §8.3, 2026-10-11)
describe('결과 화면 조립 — 요약 띠 · 카드 · 줄 · 옆 칸', () => {
  it('요약 띠 → 실패 카드 → 통과 · 미실행 줄 차례이고 미확정 묶음 칸은 없다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    const 띠 = document.querySelector('.rs');
    const 카드 = await waitFor(() => {
      const 목록 = document.querySelector('.fc-list');
      expect(목록).not.toBeNull();
      return 목록;
    });
    const 줄 = document.querySelector('.rr-rows .result-row');
    expect(앞선가(띠, 카드)).toBe(true);
    expect(앞선가(카드, 줄)).toBe(true);
    expect(document.querySelector('.rr-unconf')).toBeNull();
  });

  it('미확정 줄은 제 차례에 서고 「미확정 · 사유」 꼬리와 판정 색 거터를 단다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-004');

    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-002', 'ZRR-003', 'ZRR-004']);
    const 줄 = [...document.querySelectorAll('.rr-rows .result-row')].find((el) => el.textContent?.includes('ZRR-004'));
    expect(줄?.textContent).toContain('미확정 · 기획서에 값이 없습니다');
    expect(줄?.querySelector('.gutter')?.getAttribute('style')).toContain('var(--pass)');
  });

  it('요약은 미확정까지 모든 항목을 세고 「그중 미확정 N건」을 단다', async () => {
    연다(섞인항목, 견줌);
    await screen.findByText('이름-ZRR-002');

    const 요약 = document.querySelector('.rs')?.textContent ?? '';
    expect(요약).toContain('항목 7건 중 3건 통과');
    expect(요약).toContain('그중 미확정 2건');
    expect(판정칸('전체').textContent).toContain('7');
    expect(판정칸('실패').textContent).toContain('3');
  });

  it('도는 실행은 카드 통로도 견주기 통로도 부르지 않고 진행 집계와 줄 목록을 그린다', async () => {
    const 견줌부름 = vi.spyOn(api, 'insights').mockResolvedValue(첫실행);
    const 실패부름 = vi.spyOn(api, 'failures');
    vi.spyOn(api, 'progress').mockResolvedValue({ items: [] });
    vi.spyOn(api, 'run').mockResolvedValue({
      ...도는중응답, items: [항목줄(1, 'ZRR-001', 'desktop', 'PASS')],
    });
    const { container } = render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);

    await screen.findByText('이름-ZRR-001');
    expect(실패부름).not.toHaveBeenCalled();
    expect(견줌부름).not.toHaveBeenCalled();
    expect(container.querySelector('.rs')).toBeNull();
    expect(container.querySelector('.tally')?.textContent).toContain('통과');
    expect(screen.getByText('실행 중단')).toBeTruthy();
  });

  it('실패가 0건이면 카드 통로를 부르지 않고 한 줄만 적는다', async () => {
    const 실패부름 = 연다([항목줄(1, 'ZRR-002', 'desktop', 'PASS')]);

    expect(await screen.findByText('실패한 케이스가 없습니다')).toBeTruthy();
    expect(실패부름).not.toHaveBeenCalled();
  });

  it('판정별 보기 「실패」는 카드만, 「통과」는 줄만 그린다', async () => {
    연다(섞인항목);
    await screen.findByText('이름-ZRR-002');
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    fireEvent.click(판정칸('실패'));
    expect(document.querySelector('.fc-list')).not.toBeNull();
    expect(document.querySelector('.rr-rows')).toBeNull();

    fireEvent.click(판정칸('통과'));
    expect(document.querySelector('.fc-list')).toBeNull();
    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-002', 'ZRR-004']);

    fireEvent.click(판정칸('미실행'));
    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).toEqual(['ZRR-003']);
  });

  it('PC 실패 · 모바일 통과 케이스는 카드에만 있고 줄 목록에 또 나오지 않는다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')).not.toBeNull());

    const 줄들 = [...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent);
    expect(줄들).toEqual(['ZRR-002', 'ZRR-003', 'ZRR-004']);
    expect(document.querySelector('.fc-list')?.textContent).toContain('이름-ZRR-001');
  });

  it('미확정 실패 케이스도 카드로 가고 카드에 미확정 꼬리가 붙는다 — 줄 목록에는 없다', async () => {
    연다(섞인항목);
    await waitFor(() => expect(document.querySelector('.fc-list')?.textContent).toContain('이름-ZRR-005'));

    expect([...document.querySelectorAll('.rr-rows .tcid')].map((el) => el.textContent)).not.toContain('ZRR-005');
    expect(document.querySelector('.fc-unconf')?.textContent).toBe('미확정 · 기획서에 값이 없습니다');
  });

  it('디바이스 칩은 카드 통로에도 걸린다', async () => {
    const 실패부름 = 연다(섞인항목);
    await waitFor(() => expect(실패부름).toHaveBeenCalledWith(RUN_ID, 1, undefined));

    fireEvent.click(screen.getByRole('button', { name: '모바일' }));
    await waitFor(() => expect(실패부름).toHaveBeenLastCalledWith(RUN_ID, 1, 'mobile'));
  });

  it('옆 칸에 실행 정보 · 같은 사유로 실패 · 해결 · 증적 문서가 선다', async () => {
    연다(섞인항목, 견줌, false, [증적('PDF', 'READY')]);
    const 옆 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side');
      expect(칸?.textContent).toContain('가입 완료 안내가 안 보인다');
      return 칸!;
    });

    const 글 = 옆.textContent ?? '';
    for (const 조각 of [
      '실행 정보', '결제', '기능 테스트', 'qa', 'https://qa-pay.example.com', '김철수', 'PC, 모바일', 'RUN 2110',
      '같은 사유로 실패', '실패 항목 2건', '해결', '이름-ZRR-009', '증적 문서', '만듦',
    ]) {
      expect(글, 조각).toContain(조각);
    }
  });

  it('견줄 앞이 없으면 비교 기준 · 해결 칸은 없고 같은 사유 칸만 선다', async () => {
    연다(섞인항목, { ...첫실행, 실패덩어리들: 견줌.실패덩어리들 });
    const 옆 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side');
      expect(칸?.textContent).toContain('같은 사유로 실패');
      return 칸!;
    });

    expect(옆.textContent).toContain('실행 정보');
    expect(옆.textContent).not.toContain('비교 기준');
    expect(옆.textContent).not.toContain('해결');
  });

  it('상자 안에서는 옆 칸이 접힌 줄 하나이고 실행 정보는 그리지 않는다', async () => {
    연다(섞인항목, 견줌, true);
    const 접기 = await waitFor(() => {
      const 칸 = document.querySelector('.rr-side details');
      expect(칸).not.toBeNull();
      return 칸!;
    });

    expect(document.querySelectorAll('.rr-side details')).toHaveLength(1);
    expect(접기.hasAttribute('open')).toBe(false);
    expect(접기.querySelector('summary')?.textContent).toBe('같은 사유로 실패 1묶음 · 해결 1');
    expect(document.querySelector('.rr-side dl')).toBeNull();
    expect(앞선가(document.querySelector('.rs'), document.querySelector('.rr-side'))).toBe(true);
    expect(document.querySelector('.rows-scroll .rr-side')).not.toBeNull();
  });
});
