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

  it('미확정 묶음 표시를 주면 거터가 판정 색이 아니다', () => {
    const group = groupByCase([항목(1, 'desktop', 'FAIL')])[0]!;
    const { container } = render(<결과줄 group={group} columns={['desktop']} runId={7} 미확정묶음 />);
    const 거터 = container.querySelector('.gutter')?.getAttribute('style') ?? '';

    expect(거터).toContain('var(--line-2)');
    expect(거터).not.toContain('var(--fail)');
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

    it('줄마다 접힌 펼치기 버튼이 하나이고 이름에 TC ID 가 든다 — 디바이스가 둘이어도 하나다', () => {
      그린다([항목(1, 'desktop', 'PASS'), 항목(2, 'mobile', 'PASS')]);

      const 버튼들 = screen.getAllByRole('button', { name: /펼치기/ });
      expect(버튼들).toHaveLength(1);
      expect(버튼들[0]!.getAttribute('aria-expanded')).toBe('false');
      expect(버튼들[0]!.getAttribute('aria-controls')).not.toBeNull();
      expect(screen.getByRole('button', { name: /ZZW-0001/ })).toBeTruthy();
    });

    it('누르면 디바이스마다 첫 회차 상세를 불러와 머리와 사전조건 · 절차 · 모든 확인을 차례로 보인다', async () => {
      const 데스크톱첫 = 항목(11, 'desktop', 'PASS', 1);
      const 모바일 = 항목(13, 'mobile', 'PASS');
      const 부름 = vi.spyOn(api, 'item').mockImplementation((_run, id) =>
        Promise.resolve(상세(id === 11 ? 데스크톱첫 : 모바일, { precondition: [`사전조건 ${String(id)}`] })),
      );
      그린다([항목(12, 'desktop', 'PASS', 2), 데스크톱첫, 모바일]);

      fireEvent.click(screen.getByRole('button', { name: /ZZW-0001/ }));

      expect(await screen.findByText('사전조건 11')).toBeTruthy();
      expect(await screen.findByText('사전조건 13')).toBeTruthy();
      expect(부름).toHaveBeenCalledTimes(2);
      expect(부름).toHaveBeenCalledWith(7, 11);
      expect(부름).toHaveBeenCalledWith(7, 13);
      expect(screen.getAllByText('가입 버튼을 누른다')).toHaveLength(2);
      expect(screen.getAllByText('가입한 이메일이 보인다')).toHaveLength(2);
      expect(screen.getAllByTestId('rr-dev-head').map((h) => h.textContent)).toEqual([
        expect.stringContaining('PC'),
        expect.stringContaining('모바일'),
      ]);
    });

    it('접고 다시 펴도 상세를 다시 부르지 않는다', async () => {
      const 부름 = vi.spyOn(api, 'item').mockResolvedValue(상세(항목(1, 'desktop', 'PASS')));
      그린다([항목(1, 'desktop', 'PASS'), 항목(2, 'mobile', 'PASS')]);
      const 버튼 = screen.getByRole('button', { name: /ZZW-0001/ });

      fireEvent.click(버튼);
      await screen.findAllByText('가입 버튼을 누른다');
      fireEvent.click(버튼);
      expect(버튼.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(버튼);
      expect(버튼.getAttribute('aria-expanded')).toBe('true');
      expect(부름).toHaveBeenCalledTimes(2);
    });

    it('한 디바이스를 못 불러오면 그 자리에 오류 한 줄을 적고 다른 디바이스는 그린다', async () => {
      vi.spyOn(api, 'item').mockImplementation((_run, id) =>
        id === 1 ? Promise.reject(new Error('상세를 못 읽었습니다')) : Promise.resolve(상세(항목(2, 'mobile', 'PASS'))),
      );
      그린다([항목(1, 'desktop', 'PASS'), 항목(2, 'mobile', 'PASS')]);

      fireEvent.click(screen.getByRole('button', { name: /ZZW-0001/ }));

      expect(await screen.findByText('상세를 못 읽었습니다')).toBeTruthy();
      expect(await screen.findByText('가입 버튼을 누른다')).toBeTruthy();
    });

    it('지원하지 않는 디바이스는 패널에 머리도 호출도 없다', async () => {
      const 부름 = vi.spyOn(api, 'item').mockResolvedValue(상세(항목(1, 'desktop', 'PASS')));
      그린다([항목(1, 'desktop', 'PASS')]);

      fireEvent.click(screen.getByRole('button', { name: /ZZW-0001/ }));

      await screen.findByText('가입 버튼을 누른다');
      expect(screen.getAllByTestId('rr-dev-head')).toHaveLength(1);
      expect(부름).toHaveBeenCalledTimes(1);
    });

    it('상세 링크는 그대로 있다', () => {
      그린다([항목(1, 'desktop', 'PASS')]);

      expect(screen.getByRole('link', { name: '상세' }).getAttribute('href')).toBe('#/runs/7/items/1');
    });
  });
});
