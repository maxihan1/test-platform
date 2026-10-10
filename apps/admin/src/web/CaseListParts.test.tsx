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

import { TECHNIQUES, type Technique } from '@platform/kit/types';

import type { CaseRow, JsonSchema } from './api.js';
import { Empty } from './CaseListNotes.js';
import { 표머리 } from './CaseListHead.js';
import { 기법고르개, 케이스줄 } from './CaseListParts.js';
import { 말 } from './messages.js';

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

describe('케이스 줄의 판정 흐름', () => {
  it('디바이스마다 따로 그린다 — 한 줄로 뭉개지 않는다', () => {
    const 두디바이스: CaseRow = { ...케이스({} as unknown as JsonSchema), platforms: ['desktop', 'mobile'] };
    const 마지막 = {
      'ZZC-001:desktop': {
        tcId: 'ZZC-001', platform: 'desktop' as const, status: 'PASS' as const,
        historyId: 1, runId: 1, durationMs: 1, finishedAt: '2026-09-21T00:00:00.000Z',
        recent: ['PASS', 'PASS'] as const,
      },
      'ZZC-001:mobile': {
        tcId: 'ZZC-001', platform: 'mobile' as const, status: 'FAIL' as const,
        historyId: 2, runId: 1, durationMs: 1, finishedAt: '2026-09-21T00:00:00.000Z',
        recent: ['FAIL'] as const,
      },
    };

    const { container } = render(
      <케이스줄
        row={두디바이스}
        마지막={마지막 as unknown as Parameters<typeof 케이스줄>[0]['마지막']}
        고름={false}
        뒤집기={() => {}}
        on값={vi.fn()}
        on더보기={vi.fn()}
      />,
    );

    const 흐름들 = container.querySelectorAll('.device .spark');
    expect(흐름들).toHaveLength(2);
    expect([...흐름들[1]!.querySelectorAll('i')].map((el) => el.className)).toEqual(['f', 'e', 'e', 'e', 'e']);
  });
});

// 증적 문서의 `기록 없음`(reporting/collect.ts)과 **뜻이 다른 같은 글자**였다.
// 저쪽은 「빈 칸을 지어내지 말라」는 규칙이고 여기는 「아직 안 돌렸다」다. 여기만 바꾼다
describe('아직 안 돌린 케이스 (SPEC §8.1)', () => {
  it('마지막 결과가 없으면 무엇이 없는지 말한다', () => {
    const { container } = 그린다({});
    expect(container.querySelector('.device-none')?.textContent).toBe('실행 이력 없음');
  });
});

// 칸 이름이 없으면 각 칸이 무엇인지 화면만 봐서는 모른다 (SPEC §8.1, 2026-09-22).
// 「표머리가 있다」만 보면 입력 칸이 여전히 케이스명 안에 있는 상태도 통과한다 — 둘을 같이 본다
describe('표머리와 입력 칸 (SPEC §8.1)', () => {
  it('칸 이름이 차례로 글로 선다', () => {
    const { container } = render(<표머리 />);
    const 이름들 = [...container.querySelectorAll('.rowhead .colname')].map((el) => el.textContent);
    expect(이름들).toEqual(['TC ID', '케이스명', '입력값', '마지막 결과']);
  });

  // 표 부모 없는 row 는 행 이름을 내용으로 계산해 「이 쪽 전체 선택」을 두 번 읽었다 (진행판 WEB-F2-15)
  it('표머리에는 표 부모 없는 행 역할이 없다 — 화면 읽기가 전체 선택을 한 번만 읽는다', () => {
    render(<표머리 고름상태="none" on모두고르기={vi.fn()} />);
    expect(screen.queryByRole('row')).toBeNull();
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0);
    expect(screen.getAllByRole('checkbox', { name: '이 쪽 전체 선택' })).toHaveLength(1);
  });

  it('쌓인 줄에서 보일 「이 쪽 전체 선택」 글이 있고 화면 읽기에는 체크박스 이름 하나만 읽힌다 (PR #159)', () => {
    const { container } = render(<표머리 고름상태="none" on모두고르기={vi.fn()} />);

    const 글 = container.querySelector('.pick-all');
    expect(글?.textContent).toBe('이 쪽 전체 선택');
    expect(글?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getAllByRole('checkbox', { name: '이 쪽 전체 선택' })).toHaveLength(1);
  });

  it('「이 쪽 전체 선택」 글을 눌러도 고른다 — 라벨처럼 보이는 글이 안 눌리면 20px 네모만 노리게 된다', () => {
    const on모두고르기 = vi.fn();
    const { container } = render(<표머리 고름상태="none" on모두고르기={on모두고르기} />);

    fireEvent.click(container.querySelector('.pick-all')!);
    expect(on모두고르기).toHaveBeenCalledTimes(1);
  });

  it('전체 선택이 없는 표머리에는 그 글도 없다', () => {
    const { container } = render(<표머리 />);
    expect(container.querySelector('.pick-all')).toBeNull();
  });

  it('입력 칸이 케이스명 칸 안에 있지 않다', () => {
    const { container } = 그린다({
      type: 'object',
      properties: { userId: { type: 'string', description: '아이디', default: 'zz' } },
    });

    const 이름칸 = container.querySelector('.title');
    const 입력칸 = container.querySelector('.params');
    expect(이름칸).not.toBeNull();
    expect(입력칸).not.toBeNull();
    expect(이름칸!.contains(입력칸!)).toBe(false);
    expect(입력칸!.querySelector('input')).not.toBeNull();
  });
});

describe('설계 기법 (도메인/카탈로그 §8.1 「설계 기법」)', () => {
  const 줄그린다 = (techniques?: Technique[]) =>
    render(
      <케이스줄
        row={{ ...케이스({} as JsonSchema), unconfirmed: '기획서에 없는 문구', techniques }}
        마지막={{}}
        고름={false}
        뒤집기={() => {}}
        on값={vi.fn()}
        on더보기={vi.fn()}
      />,
    );

  it('기법은 케이스명 옆이 아니라 아래 작은 줄에 「설계 기법」 글자와 같이 선다', () => {
    const { container } = 줄그린다(['경계값 분석', '상태 전이']);

    const 작은줄 = container.querySelector('.title small');
    expect(작은줄?.textContent).toContain('설계 기법');
    expect([...(작은줄?.querySelectorAll('.tech-tag') ?? [])].map((el) => el.textContent)).toEqual(['경계값 분석', '상태 전이']);
    expect(container.querySelectorAll('.tech-tag')).toHaveLength(2);
    expect(container.querySelector('.title > .case-tag')?.textContent).toBe('미확정');
  });

  // 가운뎃점으로 이으면 덩어리가 다음 줄로 넘어갈 때 그 줄이 점으로 시작했다 (진행판 WEB-F2-14)
  it('「설계 기법」 글자와 태그는 한 덩어리이고 작은 줄 어디에도 가운뎃점이 없다', () => {
    const { container } = 줄그린다(['경계값 분석', '상태 전이']);

    const 덩어리 = container.querySelector('.title small .tech-line');
    expect(덩어리?.textContent).toBe('설계 기법 경계값 분석상태 전이');
    expect(덩어리?.querySelectorAll('.tech-tag')).toHaveLength(2);
    expect(container.querySelector('.title small')?.textContent).not.toContain('·');
  });

  it('기법이 없으면 「설계 기법」 글자도 태그도 없다', () => {
    const { container } = 줄그린다([]);
    expect(container.querySelector('.title small')?.textContent).not.toContain('설계 기법');
    expect(container.querySelector('.tech-tag')).toBeNull();
  });

  it('고르개는 전체 · kit 기법 차례 · 기법 없음이고 값은 kit 원문이다', () => {
    render(<기법고르개 기법="ALL" on기법={vi.fn()} />);

    const 고르개 = screen.getByRole('combobox', { name: '설계 기법' });
    const 값들 = [...고르개.querySelectorAll('option')].map((el) => [el.value, el.textContent]);
    expect(값들).toEqual([['ALL', '전체'], ...TECHNIQUES.map((값) => [값, 값]), ['none', '기법 없음']]);
  });

  it('라벨과 고르개는 한 덩어리라 도구 줄이 넘쳐도 갈라지지 않는다', () => {
    const { container } = render(<기법고르개 기법="ALL" on기법={vi.fn()} />);

    const 덩어리 = container.querySelector('.filter-group');
    expect(덩어리?.textContent).toContain('설계 기법');
    expect(덩어리?.contains(screen.getByRole('combobox', { name: '설계 기법' }))).toBe(true);
  });

  it('고르개 이름은 보이는 라벨 하나에서 온다 — 화면 읽기가 「설계 기법」을 한 번만 읽는다', () => {
    render(<기법고르개 기법="ALL" on기법={vi.fn()} />);

    const 고르개 = screen.getByRole('combobox', { name: '설계 기법' });
    expect(고르개.hasAttribute('aria-label')).toBe(false);
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByText('설계 기법').tagName).toBe('LABEL');
  });

  it('고르면 고른 값을 올려 보낸다', () => {
    const on기법 = vi.fn();
    render(<기법고르개 기법="ALL" on기법={on기법} />);

    fireEvent.change(screen.getByRole('combobox', { name: '설계 기법' }), { target: { value: '동등 분할' } });
    expect(on기법).toHaveBeenCalledWith('동등 분할');
  });

  // 기법 낱말은 kit 에서 오므로 소스 훑기(messages.test.ts)만으로는 번역이 빠진 것을 못 잡는다
  it('kit 의 기법 낱말이 영어 표에 다 있다', () => {
    expect(TECHNIQUES.filter((값) => 말[값] === undefined)).toEqual([]);
    expect([말['설계 기법'], 말['기법 없음']]).toEqual(['Design technique', 'No technique']);
  });
});

// 케이스 읽기면 스캔을 못 건다. 버튼을 두면 누르는 순간 403 이다 (화면공통 §8)
describe('빈 목록의 스캔 버튼', () => {
  it('스캔 길을 안 주면 버튼이 없다', () => {
    render(<Empty 형편={{ scannedAt: null, 전체건수: 0, 건조건: false, 친글자: '' }} onClear={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('조건 초기화는 스캔 길과 상관없이 선다', () => {
    render(<Empty 형편={{ scannedAt: '2026-09-21T00:00:00.000Z', 전체건수: 3, 건조건: true, 친글자: 'x' }} onClear={vi.fn()} />);
    expect(screen.getByRole('button', { name: '조건 초기화' })).toBeTruthy();
  });
});
