// @vitest-environment jsdom
// 케이스 줄의 값 칩 검사 (SPEC §8.1, 2026-09-21).
//
// 값을 보려고 상세로 한 번 더 들어가던 것을 없앴다. 그러면서 두 가지가 같이 걸린다 —
// ① 「JSON 원문을 목록에 노출하지 않는다」를 어기지 않았나 ② 비밀값이 칩으로 새지 않나.
// 둘 다 안 보면 값을 보여주려다 가려야 할 것까지 보여준 상태가 통과한다.

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import type { CaseRow, JsonSchema } from './api.js';
import { 케이스줄 } from './CaseListParts.js';

afterEach(cleanup);

function 케이스(paramSchema: JsonSchema): CaseRow {
  return {
    tcId: 'ZZC-001',
    name: '값 칩 케이스',
    platforms: ['desktop'],
    precondition: [],
    filePath: 'tests/ZZC-001.spec.ts',
    paramSchema,
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-09-21T00:00:00.000Z',
  };
}

function 그린다(paramSchema: JsonSchema) {
  return render(
    <케이스줄 row={케이스(paramSchema)} 마지막={{}} 고름={false} 뒤집기={() => {}} />,
  );
}

describe('케이스 줄의 값 칩', () => {
  it('선언된 입력값의 라벨과 기본값을 줄에서 바로 보여준다', () => {
    그린다({
      type: 'object',
      properties: {
        amount: { type: 'number', description: '결제 금액', default: 10000 },
        currency: { type: 'string', description: '통화', default: 'KRW' },
      },
    });

    expect(screen.getByText('결제 금액')).toBeTruthy();
    expect(screen.getByText('10000')).toBeTruthy();
    expect(screen.getByText('통화')).toBeTruthy();
    expect(screen.getByText('KRW')).toBeTruthy();
  });

  it('비밀값은 칩에도 안 나온다', () => {
    // 가리는 기준은 mask.ts 와 같다. 여기서 한 벌을 더 만들면 두 기준이 갈린다 (SPEC §4.1)
    그린다({
      type: 'object',
      properties: { password: { type: 'string', description: '비밀번호', default: 'hunter2' } },
    });

    expect(screen.queryByText('hunter2')).toBeNull();
    expect(screen.getByText('********')).toBeTruthy();
  });

  it('입력값을 선언하지 않은 케이스는 칩 자리를 아예 안 만든다', () => {
    const { container } = 그린다({});
    expect(container.querySelector('.chips')).toBeNull();
  });

  it('기본값이 없는 칸은 값 자리를 비운 것으로 적는다', () => {
    그린다({ type: 'object', properties: { userId: { type: 'string', description: '아이디' } } });
    expect(screen.getByText('아이디')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('객체 기본값을 [object Object] 로 그리지 않고 JSON 원문으로도 펴지 않는다', () => {
    그린다({
      type: 'object',
      properties: { options: { type: 'object', description: '옵션', default: { retry: 2 } } },
    });

    expect(screen.getByText('옵션')).toBeTruthy();
    expect(screen.queryByText('[object Object]')).toBeNull();
    expect(screen.queryByText(/retry/)).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('배열 기본값도 목록에 펴지 않고 접는다', () => {
    그린다({
      type: 'object',
      properties: { tags: { type: 'array', description: '꼬리표', default: ['smoke', 'pay'] } },
    });

    expect(screen.getByText('꼬리표')).toBeTruthy();
    expect(screen.queryByText(/smoke/)).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('null 기본값은 값이 아니라 비운 것으로 적는다', () => {
    그린다({
      type: 'object',
      properties: { memo: { type: 'string', description: '메모', default: null } },
    });

    expect(screen.queryByText('null')).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });
});
