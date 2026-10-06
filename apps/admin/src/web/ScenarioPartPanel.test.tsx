// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ④ 검사 — 케이스 단계 설정 패널(전제 · 로그인 이어받기 · 준비 · 입력값 · 기대값) (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import type { 재료들 } from './scenarioView.js';

afterEach(cleanup);

type 케이스단계 = Extract<ScenarioPart, { kind: 'case' }>;

const 단계 = (tcId: string, 덮: Partial<케이스단계> = {}): 케이스단계 => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...덮,
});

const 재료 = (tcId: string, 덮: Partial<CasePartMaterial> = {}): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
  ...덮,
});

const 준비있는 = (tcId: string) =>
  재료(tcId, {
    r16: true,
    steps: [
      { title: '로그인한다', skippable: true },
      { title: '장바구니를 비운다', skippable: true },
      { title: '결제한다', skippable: false },
    ],
  });

function 그리기(
  현재: 케이스단계,
  재: CasePartMaterial | null,
  옵션: { 쓰나?: boolean; 번호?: number; 단계들?: ScenarioPart[]; 재료맵?: 재료들 } = {},
) {
  const on바꿈 = vi.fn();
  const on케이스바꾸기 = vi.fn();
  const 맵: 재료들 = 옵션.재료맵 ?? new Map([[현재.tcId, 재]]);
  render(
    <ScenarioPartPanel
      번호={옵션.번호 ?? 1}
      단계={현재}
      단계들={옵션.단계들 ?? [현재]}
      재료={맵}
      쓰나={옵션.쓰나 ?? true}
      on바꿈={on바꿈}
      on케이스바꾸기={on케이스바꾸기}
    />,
  );
  return { on바꿈, on케이스바꾸기 };
}

const 마지막바꿈 = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)?.[0] as 케이스단계;

describe('ScenarioPartPanel 머리 · 전제 · 미확정', () => {
  it('머리에 tcId 와 이름이 나오고 전제 목록은 있을 때만 나온다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { precondition: ['회원이 있다', '상품이 있다'] }));

    expect(screen.getByText('ZSB-001 ZSB-001 케이스')).toBeTruthy();
    expect(screen.getByText('전제')).toBeTruthy();
    expect(screen.getByText('회원이 있다')).toBeTruthy();
    expect(screen.getByText('상품이 있다')).toBeTruthy();
  });

  it('전제가 없으면 전제 제목을 그리지 않는다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001'));
    expect(screen.queryByText('전제')).toBeNull();
  });

  it('미확정 케이스에만 미확정 안내가 나온다', () => {
    const 안내 = '기대값을 화면에서 읽은 케이스입니다. 이 단계가 들어간 실행에는 「미확정 포함」이 붙습니다';
    그리기(단계('ZSB-001'), 재료('ZSB-001', { unconfirmed: '화면에서 읽음' }));
    expect(screen.getByText(안내)).toBeTruthy();
    cleanup();
    그리기(단계('ZSB-001'), 재료('ZSB-001'));
    expect(screen.queryByText(안내)).toBeNull();
  });
});

describe('ScenarioPartPanel 로그인 이어받기', () => {
  it('스위치는 켜져 있고 설명을 aria-describedby 로 가리킨다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001'));
    const 스위치 = screen.getByRole('switch', { name: '로그인 이어받기' });

    expect(스위치.getAttribute('aria-checked')).toBe('true');
    const 설명 = document.getElementById(스위치.getAttribute('aria-describedby') ?? '');
    expect(설명?.textContent).toBe('앞 단계의 로그인 상태를 그대로 사용합니다. 끄면 새 창에서 단독으로 실행합니다');
    expect(screen.queryByText('로그인 이어받기를 끄면 준비 건너뛰기와 값 연결을 쓸 수 없습니다')).toBeNull();
  });

  it('끄면 carryOver false 에 건너뛰기와 값 연결이 비워져 올라간다', () => {
    const { on바꿈 } = 그리기(
      단계('ZSB-001', {
        skipSteps: ['로그인한다'],
        links: [{ kind: 'bind', param: 'id', value: { fromSeq: 1, method: 'GET', urlPattern: '**/a', jsonPath: 'id' } }],
      }),
      준비있는('ZSB-001'),
    );
    fireEvent.click(screen.getByRole('switch', { name: '로그인 이어받기' }));

    const 바뀜 = 마지막바꿈(on바꿈);
    expect(바뀜.carryOver).toBe(false);
    expect(바뀜.skipSteps).toEqual([]);
    expect(바뀜.links).toEqual([]);
  });

  it('꺼진 단계는 안내가 나오고 준비 체크박스가 잠긴다. 다시 켜면 carryOver true 가 올라간다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001', { carryOver: false }), 준비있는('ZSB-001'));
    const 스위치 = screen.getByRole('switch', { name: '로그인 이어받기' });

    expect(스위치.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('로그인 이어받기를 끄면 준비 건너뛰기와 값 연결을 쓸 수 없습니다')).toBeTruthy();
    for (const 체크 of screen.getAllByRole('checkbox')) expect((체크 as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(스위치);
    expect(마지막바꿈(on바꿈).carryOver).toBe(true);
  });
});

describe('ScenarioPartPanel 준비', () => {
  it('묶음 이름이 있고 건너뛸 수 있는 절차만 체크박스로 나온다', () => {
    그리기(단계('ZSB-001'), 준비있는('ZSB-001'));
    const 묶음 = screen.getByRole('group', { name: '준비 — 체크한 것만 실행' });
    const 체크들 = within(묶음).getAllByRole('checkbox') as HTMLInputElement[];

    expect(체크들.map((c) => c.getAttribute('aria-label') ?? c.parentElement?.textContent)).toEqual([
      '로그인한다',
      '장바구니를 비운다',
    ]);
    expect(체크들.every((c) => c.checked)).toBe(true);
    expect(within(묶음).queryByText('결제한다')).toBeNull();
  });

  it('체크를 풀면 그 제목이 skipSteps 에 들고 다시 체크하면 빠진다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001'), 준비있는('ZSB-001'));
    fireEvent.click(screen.getByRole('checkbox', { name: /장바구니를 비운다/ }));
    expect(마지막바꿈(on바꿈).skipSteps).toEqual(['장바구니를 비운다']);
  });

  it('건너뛴 제목은 체크가 풀려 보이고 다시 체크하면 skipSteps 에서 빠진다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001', { skipSteps: ['로그인한다'] }), 준비있는('ZSB-001'));
    const 로그인 = screen.getByRole('checkbox', { name: /로그인한다/ }) as HTMLInputElement;

    expect(로그인.checked).toBe(false);
    fireEvent.click(로그인);
    expect(마지막바꿈(on바꿈).skipSteps).toEqual([]);
  });

  it('앞 단계에 같은 제목의 절차가 있으면 N번에서 이미 실행 칩이 붙는다', () => {
    const 앞 = 단계('ZSB-001');
    const 지금 = 단계('ZSB-002');
    그리기(지금, 준비있는('ZSB-002'), {
      번호: 2,
      단계들: [앞, 지금],
      재료맵: new Map([
        ['ZSB-001', 준비있는('ZSB-001')],
        ['ZSB-002', 준비있는('ZSB-002')],
      ]),
    });

    expect(screen.getAllByText('1번에서 이미 실행')).toHaveLength(2);
    expect(screen.getAllByText('1번에서 이미 실행')[0]?.className).toContain('tech-tag');
  });

  it('첫 단계에는 이미 실행 칩이 없다', () => {
    그리기(단계('ZSB-001'), 준비있는('ZSB-001'));
    expect(screen.queryByText(/이미 실행/)).toBeNull();
  });

  it('r16 이 false 면 묶음 대신 건너뛸 수 없다는 문장이 나온다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001'));

    expect(screen.getByText('이 케이스는 준비가 분리되어 있지 않아 건너뛸 수 없습니다')).toBeTruthy();
    expect(screen.queryByRole('group', { name: '준비 — 체크한 것만 실행' })).toBeNull();
  });
});

const 칸스키마 = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '이름', default: '기본이름' },
    qty: { type: 'number', description: '수량' },
    agree: { type: 'boolean', description: '동의' },
    kind: { type: 'string', description: '종류', enum: ['A', 'B'] },
    pw: { type: 'string', description: '비밀번호 입력' },
  },
  required: ['qty', 'pw'],
};

describe('ScenarioPartPanel 입력값 · 기대값', () => {
  it('입력값 묶음이 있고 시작값은 코드 기본값이 있어도 빈 글자다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 칸스키마 }));
    const 묶음 = screen.getByRole('group', { name: '입력값' });

    expect((within(묶음).getByLabelText('이름') as HTMLInputElement).value).toBe('');
    expect((within(묶음).getByLabelText('수량') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('비워 둔 칸은 이 케이스에 저장해 둔 값으로 실행합니다')).toBeTruthy();
  });

  it('글자 칸은 저장값 사용을 자리글자로 보인다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 칸스키마 }));
    expect((screen.getByLabelText('이름') as HTMLInputElement).placeholder).toBe('저장값 사용');
  });

  it('참거짓 칸과 고르는 칸의 첫 선택지는 빈 값 저장값 사용이다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 칸스키마 }));

    for (const 이름 of ['동의', '종류']) {
      const 칸 = screen.getByLabelText(이름) as HTMLSelectElement;
      expect(칸.options[0]?.value).toBe('');
      expect(칸.options[0]?.textContent).toBe('저장값 사용');
      expect(칸.value).toBe('');
    }
    expect(Array.from((screen.getByLabelText('동의') as HTMLSelectElement).options).map((o) => o.value)).toEqual([
      '',
      'true',
      'false',
    ]);
    expect(Array.from((screen.getByLabelText('종류') as HTMLSelectElement).options).map((o) => o.value)).toEqual([
      '',
      'A',
      'B',
    ]);
  });

  it('칸을 채우면 params 에 키가 생기고 숫자는 숫자로 간다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 칸스키마 }));
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '3' } });
    expect(마지막바꿈(on바꿈).params).toEqual({ qty: 3 });

    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText('동의'), { target: { value: 'true' } });
    expect(마지막바꿈(on바꿈).params).toEqual({ qty: 3, kind: 'B', agree: true });
  });

  it('칸을 비우면 필수 칸이어도 키가 빠진다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001', { params: { qty: 5 } }), 재료('ZSB-001', { paramSchema: 칸스키마 }));
    const 수량 = screen.getByLabelText('수량') as HTMLInputElement;

    expect(수량.value).toBe('5');
    fireEvent.change(수량, { target: { value: '' } });
    expect(마지막바꿈(on바꿈).params).toEqual({});
  });

  it('쓰는 중인 숫자 글자는 지워지지 않는다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 칸스키마 }));
    const 수량 = screen.getByLabelText('수량') as HTMLInputElement;
    fireEvent.change(수량, { target: { value: '1.' } });
    expect(수량.value).toBe('1.');
  });

  it('비밀 칸은 password 로 그린다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { paramSchema: 칸스키마 }));
    expect((screen.getByLabelText('비밀번호 입력') as HTMLInputElement).type).toBe('password');
  });

  it('기대값 묶음도 같은 규칙으로 expected 를 만든다', () => {
    const { on바꿈 } = 그리기(
      단계('ZSB-001'),
      재료('ZSB-001', {
        expectedSchema: { type: 'object', properties: { total: { type: 'number', description: '합계' } }, required: ['total'] },
      }),
    );
    const 묶음 = screen.getByRole('group', { name: '기대값' });
    expect((within(묶음).getByLabelText('합계') as HTMLInputElement).value).toBe('');
    fireEvent.change(within(묶음).getByLabelText('합계'), { target: { value: '9' } });
    expect(마지막바꿈(on바꿈).expected).toEqual({ total: 9 });
  });

  it('값 연결이 걸린 칸은 잠기고 N번 단계 값 사용을 보인다', () => {
    그리기(
      단계('ZSB-002', {
        links: [{ kind: 'bind', param: 'qty', value: { fromSeq: 2, method: 'GET', urlPattern: '**/a', jsonPath: 'q' } }],
      }),
      재료('ZSB-002', { paramSchema: 칸스키마 }),
      { 번호: 3 },
    );
    const 수량 = screen.getByLabelText('수량') as HTMLInputElement;

    expect(수량.disabled).toBe(true);
    expect(수량.value).toBe('2번 단계 값 사용');
    expect((screen.getByLabelText('이름') as HTMLInputElement).disabled).toBe(false);
  });

  it('값 연결 자리는 넘긴 내용이 있을 때만 제목과 함께 나온다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001'), 재료('ZSB-001'));
    expect(screen.queryByText('값 연결')).toBeNull();
    expect(on바꿈).not.toHaveBeenCalled();
  });
});

describe('ScenarioPartPanel 재료 없음 · 읽기 전용', () => {
  it('재료가 없으면 안내와 케이스 바꾸기만 나온다', () => {
    const { on케이스바꾸기 } = 그리기(단계('ZSB-001'), null);

    expect(screen.getByText('케이스를 찾지 못했습니다')).toBeTruthy();
    expect(screen.getByText('다른 케이스로 바꾸면 이 단계의 준비 · 입력값 설정은 처음부터 다시 합니다')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '케이스 바꾸기' }));
    expect(on케이스바꾸기).toHaveBeenCalledTimes(1);
  });

  it('읽기만 하는 사람에게는 케이스 바꾸기가 없다', () => {
    그리기(단계('ZSB-001'), null, { 쓰나: false });
    expect(screen.getByText('케이스를 찾지 못했습니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '케이스 바꾸기' })).toBeNull();
  });

  it('읽기만 하는 사람에게는 스위치 · 체크박스 · 입력이 전부 잠긴다', () => {
    그리기(단계('ZSB-001'), { ...준비있는('ZSB-001'), paramSchema: 칸스키마 }, { 쓰나: false });

    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
    for (const 체크 of screen.getAllByRole('checkbox')) expect((체크 as HTMLInputElement).disabled).toBe(true);
    for (const 이름 of ['이름', '수량', '동의', '종류', '비밀번호 입력']) {
      expect((screen.getByLabelText(이름) as HTMLInputElement).disabled).toBe(true);
    }
    expect(screen.queryByRole('button', { name: '케이스 바꾸기' })).toBeNull();
  });

  it('재료가 아직 안 왔으면 불러오는 중을 보인다', () => {
    const 현재 = 단계('ZSB-001');
    const on = vi.fn();
    render(
      <ScenarioPartPanel
        번호={1}
        단계={현재}
        단계들={[현재]}
        재료={new Map()}
        쓰나
        on바꿈={on}
        on케이스바꾸기={on}
      />,
    );
    expect(screen.getByText('불러오는 중입니다.')).toBeTruthy();
  });
});
