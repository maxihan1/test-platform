// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ④ 검사 — 케이스 단계 설정 패널의 입력값 · 기대값 · 재료 없음 · 값 연결 자리 (도메인/시나리오 §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import { 케이스단계, 단계, 재료, 준비있는, 그리기, 마지막바꿈 } from './ScenarioPartPanel.fixture.js';

afterEach(cleanup);

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

describe('ScenarioPartPanel 값 연결 자리', () => {
  const 그리기값연결 = (현재: 케이스단계) =>
    render(
      <ScenarioPartPanel
        번호={1}
        단계={현재}
        단계들={[현재]}
        재료={new Map([[현재.tcId, 재료(현재.tcId)]])}
        쓰나
        on바꿈={vi.fn()}
        on케이스바꾸기={vi.fn()}
        값연결={<p>값 연결 편집 내용</p>}
      />,
    );

  it('값연결을 넘기면 값 연결 제목 아래에 그 내용이 보인다', () => {
    그리기값연결(단계('ZSB-001'));
    expect(screen.getByRole('heading', { name: '값 연결' })).toBeTruthy();
    expect(screen.getByText('값 연결 편집 내용')).toBeTruthy();
  });

  it('로그인 이어받기를 끄면 값 연결 자리가 없다', () => {
    그리기값연결(단계('ZSB-001', { carryOver: false }));
    expect(screen.queryByRole('heading', { name: '값 연결' })).toBeNull();
    expect(screen.queryByText('값 연결 편집 내용')).toBeNull();
  });
});
