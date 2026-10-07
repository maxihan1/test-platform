// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type ItemStatus, type Platform, type RunItemDetail, type RunItemSummary } from './api.js';
import { groupByCase } from './group.js';
import { 결과줄 } from './RunResultRow.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function 항목(
  n: number,
  platform: Platform,
  status: ItemStatus,
  attempt = 1,
  params: Record<string, unknown> = {},
): RunItemSummary {
  return {
    historyId: n,
    tcId: 'ZZW-0001',
    tcName: '로그인하면 토큰이 발급된다',
    platform,
    attempt,
    params,
    paramSchema: { type: 'object', properties: { 비밀번호: { type: 'string', secret: true } } },
    status,
    durationMs: 1200,
    error: status === 'NA' ? { message: '러너에 닿지 못했습니다' } : null,
    startedAt: '2026-09-21T00:00:00.000Z',
    finishedAt: '2026-09-21T00:01:00.000Z',
  };
}

function 그린다(items: RunItemSummary[], columns: Platform[] = ['desktop', 'mobile']) {
  const group = groupByCase(items)[0]!;
  return render(<결과줄 group={group} columns={columns} runId={7} />);
}

describe('결과줄 (SPEC §8.3)', () => {
  it('미확정 항목의 행에는 미확정 글자와 박제된 사유를 붙인다', () => {
    그린다([{ ...항목(1, 'desktop', 'PASS'), unconfirmed: '기획서에 없는 안내 문구' }]);
    expect(screen.getByText('미확정 · 기획서에 없는 안내 문구')).toBeTruthy();
  });

  it('미확정 줄은 미실행 판정 색(why)을 입지 않는다', () => {
    그린다([{ ...항목(1, 'desktop', 'PASS'), unconfirmed: '기획서에 없는 안내 문구' }]);
    expect(screen.getByText('미확정 · 기획서에 없는 안내 문구').classList.contains('why')).toBe(false);
  });

  it('확정 항목의 행에는 미확정 글자가 없다', () => {
    그린다([항목(1, 'desktop', 'PASS')]);
    expect(screen.queryByText(/미확정/)).toBeNull();
  });

  it('회차가 여럿이면 판정 칸이 몇 번 중 몇 번 통과인지 적는다', () => {
    그린다([
      항목(1, 'desktop', 'PASS', 1),
      항목(2, 'desktop', 'PASS', 2),
      항목(3, 'desktop', 'FAIL', 3),
    ]);

    expect(screen.queryByText('2/3 통과')).not.toBeNull();
  });

  it('다섯 중 셋만 통과한 칸은 통과 색으로 칠하지 않는다', () => {
    const { container } = 그린다([
      항목(1, 'desktop', 'PASS', 1),
      항목(2, 'desktop', 'PASS', 2),
      항목(3, 'desktop', 'PASS', 3),
      항목(4, 'desktop', 'FAIL', 4),
      항목(5, 'desktop', 'FAIL', 5),
    ]);
    const 거터 = container.querySelector('.gutter');

    expect(거터?.getAttribute('style')).toContain('var(--fail)');
  });

  it('지원하지 않는 디바이스 칸은 판정 대신 줄표로 비운다', () => {
    const { container } = 그린다([항목(1, 'desktop', 'PASS')]);
    const 칸들 = [...container.querySelectorAll('.device')];

    expect(칸들).toHaveLength(2);
    expect(칸들[1]?.querySelector('.device-none')?.textContent).toBe('—');
    expect(칸들[0]?.querySelector('.device-none')).toBeNull();
  });

  it('비밀값 칸은 입력값 줄에서 가려진다', () => {
    const { container } = 그린다([항목(1, 'desktop', 'FAIL', 1, { 비밀번호: 'hunter2' })]);

    expect(container.textContent).not.toContain('hunter2');
  });

  it('미실행 항목은 사유를 같이 적는다 — 없으면 러너 고장과 구분되지 않는다', () => {
    그린다([항목(1, 'desktop', 'NA')]);

    expect(screen.queryByText(/러너에 닿지 못했습니다/)).not.toBeNull();
  });

  describe('펼치기 (SPEC §8.3 통과 · 미실행 줄)', () => {
    function 상세(요약: RunItemSummary, 덮을것: Partial<RunItemDetail> = {}): RunItemDetail {
      return {
        ...요약,
        runId: 7,
        runTitle: '결제 회귀',
        precondition: ['로그인된 상태'],
        expected: {},
        expectedSchema: {},
        steps: [
          {
            seq: 1,
            title: '가입 버튼을 누른다',
            status: 'PASS',
            durationMs: 100,
            assertions: [
              { statement: '가입 완료 안내가 보인다', status: 'PASS', expected: true, actual: true },
              { statement: '가입한 이메일이 보인다', status: 'PASS', expected: true, actual: true },
            ],
          },
        ],
        ...덮을것,
      };
    }

    it('디바이스마다 접힌 펼치기 버튼이 있고 이름에 TC ID 와 디바이스가 든다', () => {
      그린다([항목(1, 'desktop', 'PASS'), 항목(2, 'mobile', 'PASS')]);

      const 버튼들 = screen.getAllByRole('button', { name: /펼치기/ });
      expect(버튼들).toHaveLength(2);
      expect(버튼들.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
      expect(screen.getByRole('button', { name: /ZZW-0001.*PC/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /ZZW-0001.*모바일/ })).toBeTruthy();
    });

    it('누르면 그 디바이스 첫 회차 상세를 불러와 사전조건 · 절차 · 모든 확인을 보인다', async () => {
      const 첫회차 = 항목(11, 'desktop', 'PASS', 1);
      const 부름 = vi.spyOn(api, 'item').mockResolvedValue(상세(첫회차));
      그린다([항목(12, 'desktop', 'PASS', 2), 첫회차, 항목(13, 'mobile', 'PASS')]);

      fireEvent.click(screen.getByRole('button', { name: /ZZW-0001.*PC/ }));

      expect(await screen.findByText('가입 버튼을 누른다')).toBeTruthy();
      expect(부름).toHaveBeenCalledTimes(1);
      expect(부름).toHaveBeenCalledWith(7, 11);
      expect(screen.getByText('로그인된 상태')).toBeTruthy();
      expect(screen.getByText('가입 완료 안내가 보인다')).toBeTruthy();
      expect(screen.getByText('가입한 이메일이 보인다')).toBeTruthy();
    });

    it('다시 누르면 접히고 또 누르면 다시 부르지 않는다', async () => {
      const 부름 = vi.spyOn(api, 'item').mockResolvedValue(상세(항목(1, 'desktop', 'PASS')));
      그린다([항목(1, 'desktop', 'PASS')]);
      const 버튼 = screen.getByRole('button', { name: /ZZW-0001.*PC/ });

      fireEvent.click(버튼);
      await screen.findByText('가입 버튼을 누른다');
      fireEvent.click(버튼);
      expect(버튼.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(버튼);
      expect(버튼.getAttribute('aria-expanded')).toBe('true');
      expect(부름).toHaveBeenCalledTimes(1);
    });

    it('못 불러오면 그 줄 안에 오류 한 줄을 적는다', async () => {
      vi.spyOn(api, 'item').mockRejectedValue(new Error('상세를 못 읽었습니다'));
      그린다([항목(1, 'desktop', 'PASS')]);

      fireEvent.click(screen.getByRole('button', { name: /ZZW-0001.*PC/ }));

      expect(await screen.findByText('상세를 못 읽었습니다')).toBeTruthy();
    });

    it('지원하지 않는 디바이스 칸에는 펼치기 버튼이 없다', () => {
      그린다([항목(1, 'desktop', 'PASS')]);

      expect(screen.queryByRole('button', { name: /ZZW-0001.*모바일/ })).toBeNull();
    });

    it('상세 링크는 그대로 있다', () => {
      그린다([항목(1, 'desktop', 'PASS')]);

      expect(screen.getByRole('link', { name: '상세' }).getAttribute('href')).toBe('#/runs/7/items/1');
    });
  });
});
