// @vitest-environment jsdom
// 케이스 줄 안의 입력 칸 검사 (SPEC §8.1, 2026-09-21).
//
// 읽기만 하던 값 칩이 고칠 수 있는 칸이 됐다. 그러면서 셋이 같이 걸린다 —
// ① 비밀값이 가려진 채로 입력되나 ② 브라우저 비밀번호 관리자가 이 화면의 로그인 비밀번호를
// 후보로 내미는 것을 막았나 ③ 칸이 많은 케이스가 줄을 통째로 삼키지 않나.
// 셋 다 안 보면 값을 고치게 하려다 비밀번호를 평문으로 흘리는 상태가 통과한다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { JsonSchema } from './api.js';
import { CaseRowParams } from './CaseRowParams.js';

afterEach(cleanup);

function 스키마(칸들: Record<string, { type: string; description: string; default?: unknown }>): JsonSchema {
  return { type: 'object', properties: 칸들 } as unknown as JsonSchema;
}

const 빈스키마 = 스키마({});

describe('케이스 줄의 입력 칸', () => {
  it('기본값이 이미 채워져 있다', () => {
    render(
      <CaseRowParams
        tcId="ZZP-001"
        paramSchema={스키마({ card: { type: 'string', description: '카드번호', default: '4000-0002' } })}
        expectedSchema={빈스키마}
        on값={() => undefined}
        on더보기={() => undefined}
      />,
    );

    expect((screen.getByLabelText(/카드번호/) as HTMLInputElement).value).toBe('4000-0002');
  });

  it('값을 고치면 어느 자리의 어느 칸인지까지 알려 준다', () => {
    const 받은 = vi.fn();
    render(
      <CaseRowParams
        tcId="ZZP-002"
        paramSchema={스키마({ card: { type: 'string', description: '카드번호', default: '4000-0002' } })}
        expectedSchema={빈스키마}
        on값={받은}
        on더보기={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText(/카드번호/), { target: { value: '4000-9999' } });

    expect(받은).toHaveBeenCalledWith('params', 'card', '4000-9999');
  });

  it('비밀값 칸은 가려서 입력받고 비밀번호 관리자가 끼어들지 못하게 한다', () => {
    render(
      <CaseRowParams
        tcId="ZZP-003"
        paramSchema={스키마({ password: { type: 'string', description: '비밀번호', default: 'pw1234' } })}
        expectedSchema={빈스키마}
        on값={() => undefined}
        on더보기={() => undefined}
      />,
    );

    const 칸 = screen.getByLabelText(/비밀번호/);
    expect(칸.getAttribute('type')).toBe('password');
    // 이것이 없으면 이 관리 화면의 로그인 비밀번호가 후보로 뜨고,
    // 잘못 고르면 run_item.params 에 평문으로 남는데 화면에는 ******** 로 가려져 들어간 줄도 모른다
    expect(칸.getAttribute('autocomplete')).toBe('new-password');
  });

  it('칸이 넷을 넘으면 줄에는 넷만 보이고 나머지는 상세로 넘긴다', () => {
    const 더보기 = vi.fn();
    render(
      <CaseRowParams
        tcId="ZZP-004"
        paramSchema={스키마({
          a: { type: 'string', description: '하나', default: '1' },
          b: { type: 'string', description: '둘', default: '2' },
          c: { type: 'string', description: '셋', default: '3' },
          d: { type: 'string', description: '넷', default: '4' },
          e: { type: 'string', description: '다섯', default: '5' },
          f: { type: 'string', description: '여섯', default: '6' },
        })}
        expectedSchema={빈스키마}
        on값={() => undefined}
        on더보기={더보기}
      />,
    );

    expect(screen.getByLabelText(/넷/)).toBeTruthy();
    expect(screen.queryByLabelText(/다섯/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /2개 더/ }));
    expect(더보기).toHaveBeenCalled();
  });

  it('선언한 칸이 하나도 없으면 자리를 만들지 않는다', () => {
    const { container } = render(
      <CaseRowParams
        tcId="ZZP-005"
        paramSchema={빈스키마}
        expectedSchema={빈스키마}
        on값={() => undefined}
        on더보기={() => undefined}
      />,
    );

    expect(container.querySelector('.pcell')).toBeNull();
  });
});
