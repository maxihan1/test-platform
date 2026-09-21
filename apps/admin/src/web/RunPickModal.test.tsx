// @vitest-environment jsdom
// 여러 건 실행 확인 모달 검사 (SPEC §8.10).
//
// 가장 비싼 축은 ⑤ 「몇 건 생기는가」다. 케이스마다 디바이스 선언이 달라
// 곱셈으로 세면 있지도 않은 조합을 센다 — 둘짜리 하나와 하나짜리 하나는 2도 4도 아닌 3건이다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { CaseRow, JsonSchema, Platform, ServiceRow } from './api.js';
import { RunPickModal } from './RunPickModal.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다
afterEach(() => {
  cleanup();
});

const 빈스키마: JsonSchema = {};
const 아이디스키마: JsonSchema = {
  type: 'object',
  properties: { userId: { type: 'string', description: '아이디' } },
  required: ['userId'],
};

function 케이스(tcId: string, platforms: Platform[], paramSchema: JsonSchema): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms,
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema,
    expectedSchema: 빈스키마,
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

const 값없는케이스 = 케이스('ZPM-001', ['desktop', 'mobile'], 빈스키마);
const 값있는케이스 = 케이스('ZPM-002', ['desktop'], 아이디스키마);

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPM',
  name: '결제',
  color: '#123456',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: true,
};

function 그리기(케이스들: CaseRow[] = [값없는케이스, 값있는케이스], 사유?: string) {
  const onRun = vi.fn();
  const onClose = vi.fn();
  render(<RunPickModal 케이스들={케이스들} service={서비스} 사유={사유} onRun={onRun} onClose={onClose} />);
  return { onRun, onClose };
}

const 실행버튼 = () => screen.getByRole('button', { name: '실행하기' });
const 줄 = () => screen.getByRole('status');

describe('RunPickModal', () => {
  it('고른 케이스가 줄로 다 보인다', () => {
    그리기();
    expect(screen.getByText('ZPM-001')).toBeTruthy();
    expect(screen.getByText('ZPM-002')).toBeTruthy();
    expect(screen.getByText('ZPM-001 케이스')).toBeTruthy();
    expect(screen.getByText('ZPM-002 케이스')).toBeTruthy();
  });

  it('입력칸이 있는 케이스에만 값 고치기가 붙는다', () => {
    그리기();
    expect(screen.getByRole('button', { name: 'ZPM-002 값 고치기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZPM-001 값 고치기' })).toBeNull();
  });

  it('값 고치기를 누르면 그 케이스의 입력칸이 보인다', () => {
    그리기();
    expect(screen.queryByLabelText('아이디')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ZPM-002 값 고치기' }));

    expect(screen.getByLabelText('아이디')).toBeTruthy();
  });

  it('대상 서버를 안 고르면 실행이 안 걸리고 사유가 화면 줄로 뜬다', () => {
    const { onRun } = 그리기();

    fireEvent.click(실행버튼());

    expect(onRun).not.toHaveBeenCalled();
    expect(줄().textContent).toContain('대상 서버를 고르세요');
  });

  it('값을 고치고 실행하면 그 값이 onRun 의 items 에 실린다', () => {
    // 고친 값을 통째로 버려도 「안 불렸다」만 보는 단언은 초록이다. 무엇을 받았는지까지 본다
    const { onRun } = 그리기();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(screen.getByRole('button', { name: 'ZPM-002 값 고치기' }));
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'zpm-tester' } });
    fireEvent.click(실행버튼());

    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'qa',
        items: [
          { tcId: 'ZPM-001', platforms: ['desktop', 'mobile'], params: {}, expected: {} },
          { tcId: 'ZPM-002', platforms: ['desktop'], params: { userId: 'zpm-tester' }, expected: {} },
        ],
      }),
    );
  });

  it('실행 항목 수는 디바이스 수가 다른 케이스들에서도 합이다', () => {
    // 둘짜리 하나 + 하나짜리 하나 = 3건. 곱셈이면 2나 4가 나온다
    그리기();
    expect(줄().textContent).toContain('실행 항목이 3건 생깁니다');
  });

  it('상한을 넘으면 실행하기가 막히고 이유가 화면 줄로 뜬다', () => {
    그리기();

    fireEvent.change(screen.getByLabelText('반복'), { target: { value: '400' } });

    expect(실행버튼().hasAttribute('disabled')).toBe(true);
    expect(줄().textContent).toContain('1000건까지');
    // 말풍선이 아니라 화면 줄이어야 한다 (DESIGN.md 접근성 기준)
    expect(실행버튼().hasAttribute('title')).toBe(false);
  });

  it('거절당한 사유가 오면 건수 안내를 밀어내고 그 줄에 뜬다', () => {
    그리기(undefined, '그 케이스를 찾지 못했습니다 — 카탈로그에 없는 케이스다: ZPM-002');

    expect(줄().textContent).toBe('그 케이스를 찾지 못했습니다 — 카탈로그에 없는 케이스다: ZPM-002');
    expect(줄().getAttribute('style')).toContain('--fail');
  });

  it('사유가 있어도 버튼을 죽인 이유가 먼저다', () => {
    // 옛 사유가 덮으면 버튼이 왜 안 눌리는지 읽을 자리가 사라진다 (DESIGN.md 접근성 기준)
    그리기(undefined, '그 케이스를 찾지 못했습니다');

    fireEvent.change(screen.getByLabelText('반복'), { target: { value: '400' } });

    expect(실행버튼().hasAttribute('disabled')).toBe(true);
    expect(줄().textContent).toContain('1000건까지');
  });
});
