// @vitest-environment jsdom
// 케이스 줄 검사 (SPEC §8.1, 2026-09-21).
//
// 2026-10-19 ⑫ 시안 A 에서 줄의 입력 칸 · 「상세」 버튼 · 「지원 디바이스」 글이 없어졌다.
// 값은 오른쪽 상세 칸(CaseDetail)에서 고친다. 줄은 이름 버튼 하나로 그 칸을 연다.
// 입력 칸의 규칙(상한 · 비밀값)은 Form.test.tsx · CaseDetail.test.tsx 가 본다. 여기는 줄이 값 칸을 더는 안 가졌다는 것까지 본다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { TECHNIQUES, type Technique } from '@platform/kit/types';

import type { CaseRow, JsonSchema, ServiceRow } from './api.js';
import { 지금앱칸 } from './Head.js';
import { Empty } from './CaseListNotes.js';
import { 표머리 } from './CaseListHead.js';
import { 케이스줄 } from './CaseListParts.js';
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

const 값있는스키마 = {
  type: 'object',
  properties: { currency: { type: 'string', description: '통화', default: 'KRW' } },
} as unknown as JsonSchema;

function 그린다(paramSchema: JsonSchema, 덮을것: Partial<React.ComponentProps<typeof 케이스줄>> = {}) {
  const on열기 = vi.fn();
  return {
    on열기,
    ...render(<케이스줄 row={케이스(paramSchema)} 마지막={{}} 고름={false} 뒤집기={() => {}} on열기={on열기} {...덮을것} />),
  };
}

describe('케이스 줄 — 입력 칸은 상세 칸으로 옮겼다 (⑫ 시안 A)', () => {
  it('입력값을 선언한 케이스여도 줄에는 입력 칸 · 비밀값 칸이 없다', () => {
    const { container } = 그린다({
      type: 'object',
      properties: {
        currency: { type: 'string', description: '통화', default: 'KRW' },
        password: { type: 'string', description: '비밀번호', default: 'hunter2' },
      },
    } as unknown as JsonSchema);

    expect(container.querySelector('input:not([type="checkbox"])')).toBeNull();
    expect(container.querySelector('.pcell, .params')).toBeNull();
    expect(screen.queryByLabelText(/통화/)).toBeNull();
    expect(screen.queryByText('hunter2')).toBeNull();
    expect(screen.queryByRole('button', { name: /1개 더/ })).toBeNull();
  });

  it('줄에 「상세」 버튼이 따로 없다 — 케이스 이름이 그 버튼이다', () => {
    그린다(값있는스키마);

    expect(screen.queryByRole('button', { name: '상세' })).toBeNull();
    expect(screen.getByRole('button', { name: '값 칸 케이스' })).toBeTruthy();
  });
});

describe('케이스 줄의 이름 버튼 (점검 7.12)', () => {
  it('이름을 누르면 케이스 번호를 들고 on열기 를 부른다', () => {
    const { on열기 } = 그린다(값있는스키마);

    fireEvent.click(screen.getByRole('button', { name: '값 칸 케이스' }));

    expect(on열기).toHaveBeenCalledWith('ZZC-001');
  });

  it('버튼 id 는 case-open-<tcId> 이다 — 상세 칸을 닫으면 포커스가 여기로 돌아온다', () => {
    그린다(값있는스키마);

    expect(screen.getByRole('button', { name: '값 칸 케이스' }).id).toBe('case-open-ZZC-001');
  });

  it('열림이 아니면 aria-expanded=false, 열림이면 true 이고 줄에 row-open 이 붙는다', () => {
    const { container, rerender } = render(
      <케이스줄 row={케이스(값있는스키마)} 마지막={{}} 고름={false} 뒤집기={() => {}} on열기={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: '값 칸 케이스' }).getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.row-open')).toBeNull();

    rerender(<케이스줄 row={케이스(값있는스키마)} 마지막={{}} 고름={false} 뒤집기={() => {}} 열림 on열기={vi.fn()} />);

    expect(screen.getByRole('button', { name: '값 칸 케이스' }).getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.row-open')).not.toBeNull();
  });

  it('줄 고름 칸은 이름으로 케이스를 가리키고 누르면 뒤집기 를 부른다', () => {
    const 뒤집기 = vi.fn();
    그린다(값있는스키마, { 뒤집기 });

    fireEvent.click(screen.getByRole('checkbox', { name: 'ZZC-001 값 칸 케이스 고르기' }));

    expect(뒤집기).toHaveBeenCalledTimes(1);
  });

  it('실행 길(on실행)이 있으면 아이콘 버튼이 그 한 건으로 부른다. 없으면 버튼도 없다', () => {
    const on실행 = vi.fn();
    const { unmount } = 그린다(값있는스키마, { on실행 });

    fireEvent.click(screen.getByRole('button', { name: 'ZZC-001 실행' }));
    expect(on실행).toHaveBeenCalledTimes(1);
    expect((on실행.mock.calls[0]![0] as CaseRow).tcId).toBe('ZZC-001');

    unmount();
    그린다(값있는스키마);
    expect(screen.queryByRole('button', { name: 'ZZC-001 실행' })).toBeNull();
  });

  it('미확정 배지에 사유가 말풍선(title)으로 붙는다. 확정 케이스에는 배지가 없다', () => {
    const { container, unmount } = 그린다(값있는스키마, { row: { ...케이스(값있는스키마), unconfirmed: '확인 필요 — MKT-REQ-003' } });

    const 배지 = container.querySelector('.case-tag');
    expect(배지?.textContent).toBe('미확정');
    expect(배지?.getAttribute('title')).toBe('확인 필요 — MKT-REQ-003');

    unmount();
    const 확정 = 그린다(값있는스키마);
    expect(확정.container.querySelector('.case-tag')).toBeNull();
  });

  it('줄 아래 작은 줄에 「지원 디바이스」 글을 안 적는다', () => {
    const { container } = 그린다(값있는스키마, { row: { ...케이스(값있는스키마), platforms: ['desktop', 'mobile'] } });

    expect(container.textContent).not.toContain('지원 디바이스');
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
        on열기={vi.fn()}
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
    expect(container.querySelector('.device-none')?.textContent).toBe('실행 기록 없음');
  });
});

// 칸 이름이 없으면 각 칸이 무엇인지 화면만 봐서는 모른다 (SPEC §8.1, 2026-09-22).
// 「표머리가 있다」만 보면 입력 칸이 여전히 케이스명 안에 있는 상태도 통과한다 — 둘을 같이 본다
describe('표머리 (SPEC §8.1)', () => {
  it('칸 이름이 차례로 글로 선다', () => {
    const { container } = render(<표머리 />);
    const 이름들 = [...container.querySelectorAll('.rowhead .colname')].map((el) => el.textContent);
    expect(이름들).toEqual(['TC ID', '케이스명', '마지막 결과']);
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
});

describe('설계 기법 (도메인/카탈로그 §8.1 「설계 기법」)', () => {
  const 줄그린다 = (techniques?: Technique[]) =>
    render(
      <케이스줄
        row={{ ...케이스({} as JsonSchema), unconfirmed: '기획서에 없는 문구', techniques }}
        마지막={{}}
        고름={false}
        뒤집기={() => {}}
        on열기={vi.fn()}
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

  // 기법 낱말은 kit 에서 오므로 소스 훑기(messages.test.ts)만으로는 번역이 빠진 것을 못 잡는다
  it('kit 의 기법 낱말이 영어 표에 다 있다', () => {
    expect(TECHNIQUES.filter((값) => 말[값] === undefined)).toEqual([]);
    expect([말['설계 기법'], 말['기법 없음']]).toEqual(['Design technique', 'No technique']);
  });
});

// 케이스 읽기면 스캔을 못 건다. 버튼을 두면 누르는 순간 403 이다 (화면공통 §8)
describe('빈 목록의 스캔 버튼', () => {
  it('스캔 길을 안 주면 버튼이 없다', () => {
    render(<Empty 형편={{ scannedAt: null, 스캔문제: false, 전체건수: 0, 건조건: false, 친글자: '' }} onClear={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('조건 초기화는 스캔 길과 상관없이 선다', () => {
    render(<Empty 형편={{ scannedAt: '2026-09-21T00:00:00.000Z', 스캔문제: false, 전체건수: 3, 건조건: true, 친글자: 'x' }} onClear={vi.fn()} />);
    expect(screen.getByRole('button', { name: '조건 초기화' })).toBeTruthy();
  });

  it('디바이스를 고를 것이 없는 종류(API · 앱)의 케이스 줄에는 디바이스 이름을 그리지 않는다 — 웹은 그대로 (도메인/API · 시안 11판 · WEB-F7-18)', () => {
    const 줄 = (kind: ServiceRow['kind']) =>
      render(
        <지금앱칸.Provider value={{ kind } as ServiceRow}>
          <케이스줄 row={케이스({})} 마지막={{}} 고름={false} 뒤집기={() => {}} on열기={vi.fn()} />
        </지금앱칸.Provider>,
      ).container;
    expect(줄('API').querySelector('.device-name')).toBeNull();
    cleanup();
    expect(줄('APP').querySelector('.device-name')).toBeNull();
    cleanup();
    expect(줄('SCREEN').querySelector('.device-name')?.textContent).toBe('PC');
  });
});
