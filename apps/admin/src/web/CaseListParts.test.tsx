// @vitest-environment jsdom
// 케이스 줄 검사 (SPEC §8.1, 2026-09-21).
//
// 읽기만 하던 값 칩이 **고칠 수 있는 칸**이 됐다 (2026-09-21 ②). 그러면서 둘이 같이 걸린다 —
// ① 「JSON 원문을 목록에 노출하지 않는다」를 어기지 않았나 ② 비밀값이 평문으로 새지 않나.
// 둘 다 안 보면 값을 고치게 하려다 가려야 할 것까지 보여준 상태가 통과한다.
//
// 칸 자체의 규칙(상한 넷 · autoComplete)은 CaseRowParams.test.tsx 가 본다. 여기는 줄과의 접합이다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { CaseRow, JsonSchema } from './api.js';
import { 케이스줄 } from './CaseListParts.js';

afterEach(cleanup);

function 케이스(paramSchema: JsonSchema): CaseRow {
  return {
    tcId: 'ZZC-001',
    name: '값 칸 케이스',
    platforms: ['desktop'],
    precondition: [],
    filePath: 'tests/ZZC-001.spec.ts',
    paramSchema,
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

function 그린다(paramSchema: JsonSchema, on값 = vi.fn(), on더보기 = vi.fn()) {
  return {
    on값,
    on더보기,
    ...render(
      <케이스줄
        row={케이스(paramSchema)}
        마지막={{}}
        고름={false}
        뒤집기={() => {}}
        on값={on값}
        on더보기={on더보기}
      />,
    ),
  };
}

describe('케이스 줄의 값 칸', () => {
  it('선언된 입력값이 라벨 붙은 입력칸으로 줄에 바로 나온다', () => {
    그린다({
      type: 'object',
      properties: {
        amount: { type: 'number', description: '결제 금액', default: 10000 },
        currency: { type: 'string', description: '통화', default: 'KRW' },
      },
    } as unknown as JsonSchema);

    expect((screen.getByLabelText(/결제 금액/) as HTMLInputElement).value).toBe('10000');
    expect((screen.getByLabelText(/통화/) as HTMLInputElement).value).toBe('KRW');
  });

  it('값을 고치면 어느 케이스의 어느 칸인지까지 올려 보낸다', () => {
    const { on값 } = 그린다({
      type: 'object',
      properties: { currency: { type: 'string', description: '통화', default: 'KRW' } },
    } as unknown as JsonSchema);

    fireEvent.change(screen.getByLabelText(/통화/), { target: { value: 'USD' } });

    expect(on값).toHaveBeenCalledWith('ZZC-001', 'params', 'currency', 'USD');
  });

  it('비밀값은 가려서 입력받고 줄에 평문으로 안 나온다', () => {
    // 가리는 기준은 mask.ts 와 같다. 여기서 한 벌을 더 만들면 두 기준이 갈린다 (SPEC §4.1)
    그린다({
      type: 'object',
      properties: { password: { type: 'string', description: '비밀번호', default: 'hunter2' } },
    } as unknown as JsonSchema);

    expect(screen.queryByText('hunter2')).toBeNull();
    expect(screen.getByLabelText(/비밀번호/).getAttribute('type')).toBe('password');
  });

  it('입력값을 선언하지 않은 케이스는 칸 자리를 아예 안 만든다', () => {
    const { container } = 그린다({} as unknown as JsonSchema);
    expect(container.querySelector('.pcell')).toBeNull();
  });

  it('객체 기본값은 줄에 펴지 않고 상세로 넘긴다', () => {
    // Form 은 객체 기본값을 JSON.stringify 로 편다. 목록에 원문을 내는 것은 금지다 (DESIGN.md 「금지」)
    const { container } = 그린다({
      type: 'object',
      properties: { options: { type: 'object', description: '옵션', default: { retry: 2 } } },
    } as unknown as JsonSchema);

    expect(container.querySelector('.pcell')).toBeTruthy();
    expect(screen.queryByLabelText(/옵션/)).toBeNull();
    expect(screen.queryByText(/retry/)).toBeNull();
    expect(screen.queryByText('[object Object]')).toBeNull();
    expect(screen.getByRole('button', { name: /1개 더/ })).toBeTruthy();
  });

  it('배열 기본값도 줄에 펴지 않는다', () => {
    그린다({
      type: 'object',
      properties: { tags: { type: 'array', description: '꼬리표', default: ['smoke', 'pay'] } },
    } as unknown as JsonSchema);

    expect(screen.queryByLabelText(/꼬리표/)).toBeNull();
    expect(screen.queryByText(/smoke/)).toBeNull();
  });

  it('상세로 넘긴 칸을 보러 가면 그 케이스 번호를 들고 간다', () => {
    const { on더보기 } = 그린다({
      type: 'object',
      properties: {
        a: { type: 'string', description: '하나', default: '1' },
        b: { type: 'string', description: '둘', default: '2' },
        c: { type: 'string', description: '셋', default: '3' },
        d: { type: 'string', description: '넷', default: '4' },
        e: { type: 'string', description: '다섯', default: '5' },
      },
    } as unknown as JsonSchema);

    fireEvent.click(screen.getByRole('button', { name: /1개 더/ }));
    expect(on더보기).toHaveBeenCalledWith('ZZC-001');
  });
});
