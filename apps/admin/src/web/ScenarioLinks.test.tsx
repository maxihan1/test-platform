// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ⑤ 검사 — 케이스 단계의 값 연결 편집(종류 넷 · 가져올 단계 · 넣을 칸) (도메인/시나리오 §8.11)

import type { ScenarioLink, ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { CasePartMaterial } from './scenarioApi.js';
import { ScenarioLinks } from './ScenarioLinks.js';
import type { 재료들 } from './scenarioView.js';

afterEach(cleanup);

type 케이스단계 = Extract<ScenarioPart, { kind: 'case' }>;

const 단계 = (tcId: string, links?: ScenarioLink[]): 케이스단계 => ({
  kind: 'case',
  tcId,
  params: {},
  expected: {},
  skipSteps: [],
  ...(links === undefined ? {} : { links }),
});

const 재료 = (tcId: string, 칸: string[]): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: Object.fromEntries(칸.map((k) => [k, { type: 'string' }])) },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
});

const api: ScenarioPart = { kind: 'api', method: 'GET', path: '/x', expectStatus: 200 };
const 참조 = { fromSeq: 1, method: 'POST', urlPattern: '/api/orders', jsonPath: '$.id' } as const;

function 그리기(links: ScenarioLink[] | undefined, 옵션: { 쓰나?: boolean; 앞?: ScenarioPart[] } = {}) {
  const 앞 = 옵션.앞 ?? [단계('ZSB-001'), api];
  const 현재 = 단계('ZSB-003', links);
  const 맵: 재료들 = new Map([['ZSB-003', 재료('ZSB-003', ['orderId', 'memo'])]]);
  const on바꿈 = vi.fn();
  render(
    <ScenarioLinks
      번호={앞.length + 1}
      단계={현재}
      단계들={[...앞, 현재]}
      재료={맵}
      쓰나={옵션.쓰나 ?? true}
      on바꿈={on바꿈}
    />,
  );
  return { on바꿈 };
}

const 마지막 = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)?.[0] as ScenarioLink[];
const 칸수 = (묶음: HTMLElement) => 묶음.querySelectorAll('input, select').length;

describe('ScenarioLinks 추가', () => {
  it('추가 버튼은 종류 넷을 버튼으로 펼치고 고르면 기본값 값 연결을 끝에 더하며 닫힌다', () => {
    const { on바꿈 } = 그리기([{ kind: 'block', method: 'GET', urlPattern: '/a' }]);
    const 추가 = screen.getByRole('button', { name: '+ 값 연결 추가' });
    expect(추가.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(추가);
    expect(추가.getAttribute('aria-expanded')).toBe('true');
    for (const 이름 of ['값 주입', '요청 차단', '이전 응답 재사용', '수정 요청으로 변경']) {
      expect(screen.getByRole('button', { name: 이름 })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole('button', { name: '값 주입' }));
    expect(마지막(on바꿈)).toEqual([
      { kind: 'block', method: 'GET', urlPattern: '/a' },
      { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'GET', urlPattern: '', jsonPath: '' } },
    ]);
    expect(추가.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: '요청 차단' })).toBeNull();
  });

  it('나머지 종류의 기본값도 kit 모양 그대로다', () => {
    const { on바꿈 } = 그리기(undefined);
    const 더하기 = (이름: string) => {
      fireEvent.click(screen.getByRole('button', { name: '+ 값 연결 추가' }));
      fireEvent.click(screen.getByRole('button', { name: 이름 }));
      return 마지막(on바꿈);
    };
    expect(더하기('요청 차단')).toEqual([{ kind: 'block', method: 'GET', urlPattern: '' }]);
    expect(더하기('이전 응답 재사용')).toEqual([{ kind: 'reuse', method: 'GET', urlPattern: '', fromSeq: 1 }]);
    expect(더하기('수정 요청으로 변경')).toEqual([
      {
        kind: 'rewrite',
        method: 'GET',
        urlPattern: '',
        to: { method: 'PATCH', path: '', value: { fromSeq: 1, method: 'GET', urlPattern: '', jsonPath: '' } },
      },
    ]);
  });

  it('값 주입의 기본 칸은 다른 값 주입이 안 쓴 첫 칸이다', () => {
    const { on바꿈 } = 그리기([{ kind: 'bind', param: 'orderId', value: 참조 }]);
    fireEvent.click(screen.getByRole('button', { name: '+ 값 연결 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '값 주입' }));
    expect((마지막(on바꿈)[1] as Extract<ScenarioLink, { kind: 'bind' }>).param).toBe('memo');
  });

  it('앞에 케이스 단계가 없으면 세 종류 대신 안내 문장이 나오고 요청 차단은 남는다', () => {
    그리기(undefined, { 앞: [api] });
    fireEvent.click(screen.getByRole('button', { name: '+ 값 연결 추가' }));
    expect(screen.getByText('앞에 값을 가져올 케이스 단계가 없습니다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '요청 차단' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '값 주입' })).toBeNull();
    expect(screen.queryByRole('button', { name: '이전 응답 재사용' })).toBeNull();
    expect(screen.queryByRole('button', { name: '수정 요청으로 변경' })).toBeNull();
  });
});

describe('ScenarioLinks 종류마다 칸', () => {
  it('안내 문장이 늘 보인다', () => {
    그리기(undefined);
    expect(screen.getByText('값 연결은 첫 확인이 나오기 전 준비에서만 적용됩니다')).toBeTruthy();
  });

  it('값 주입', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: 참조 }]);
    const 묶음 = screen.getByRole('group', { name: '값 주입' });
    for (const 이름 of ['넣을 칸', '가져올 단계', '메서드', 'URL 패턴', 'JSON 경로']) {
      expect(within(묶음).getByLabelText(이름)).toBeTruthy();
    }
    expect(칸수(묶음)).toBe(5);
  });

  it('요청 차단', () => {
    그리기([{ kind: 'block', method: 'GET', urlPattern: '/a' }]);
    const 묶음 = screen.getByRole('group', { name: '요청 차단' });
    expect(within(묶음).getByLabelText('메서드')).toBeTruthy();
    expect(within(묶음).getByLabelText('URL 패턴')).toBeTruthy();
    expect(칸수(묶음)).toBe(2);
  });

  it('이전 응답 재사용', () => {
    그리기([{ kind: 'reuse', method: 'GET', urlPattern: '/a', fromSeq: 1 }]);
    const 묶음 = screen.getByRole('group', { name: '이전 응답 재사용' });
    for (const 이름 of ['메서드', 'URL 패턴', '가져올 단계']) expect(within(묶음).getByLabelText(이름)).toBeTruthy();
    expect(칸수(묶음)).toBe(3);
  });

  it('수정 요청으로 변경은 가져올 값 묶음 안에 같은 이름의 칸이 한 벌 더 있다', () => {
    그리기([
      {
        kind: 'rewrite',
        method: 'GET',
        urlPattern: '/a',
        to: { method: 'PATCH', path: '/orders/{}', value: 참조 },
      },
    ]);
    const 묶음 = screen.getByRole('group', { name: '수정 요청으로 변경' });
    for (const 이름 of ['바꿀 메서드', '수정 주소']) expect(within(묶음).getByLabelText(이름)).toBeTruthy();
    expect(screen.getByText('수정 주소의 {} 자리에 가져온 값이 들어갑니다')).toBeTruthy();
    const 값묶음 = within(묶음).getByRole('group', { name: '가져올 값' });
    for (const 이름 of ['가져올 단계', '메서드', 'URL 패턴', 'JSON 경로']) {
      expect(within(값묶음).getByLabelText(이름)).toBeTruthy();
    }
    expect(within(묶음).getAllByLabelText('메서드')).toHaveLength(2);
    expect(within(묶음).getAllByLabelText('URL 패턴')).toHaveLength(2);
    const 모든아이디 = [...묶음.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(모든아이디).size).toBe(모든아이디.length);
  });
});

describe('ScenarioLinks 선택지', () => {
  it('가져올 단계는 자기보다 앞의 케이스 단계만 `{번호}번 {tcId}` 로 보인다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: 참조 }], { 앞: [단계('ZSB-001'), api, 단계('ZSB-002')] });
    const 고르개 = screen.getByLabelText('가져올 단계') as HTMLSelectElement;
    expect([...고르개.options].map((o) => o.textContent)).toEqual(['1번 ZSB-001', '3번 ZSB-002']);
    expect(고르개.value).toBe('1');
  });

  it('가져올 단계를 바꾸면 그 번호가 값 주입의 fromSeq 로 올라간다', () => {
    const { on바꿈 } = 그리기([{ kind: 'bind', param: 'orderId', value: 참조 }], {
      앞: [단계('ZSB-001'), api, 단계('ZSB-002')],
    });
    fireEvent.change(screen.getByLabelText('가져올 단계'), { target: { value: '3' } });
    expect(마지막(on바꿈)).toEqual([{ kind: 'bind', param: 'orderId', value: { ...참조, fromSeq: 3 } }]);
  });

  it('넣을 칸은 입력값 칸 이름이고 다른 값 주입이 쓴 칸은 빠지며 자기 칸은 남는다', () => {
    그리기([
      { kind: 'bind', param: 'orderId', value: 참조 },
      { kind: 'bind', param: 'memo', value: 참조 },
    ]);
    const [첫째, 둘째] = screen.getAllByLabelText('넣을 칸') as HTMLSelectElement[];
    expect([...첫째!.options].map((o) => o.value)).toEqual(['orderId']);
    expect([...둘째!.options].map((o) => o.value)).toEqual(['memo']);
  });

  it('넣을 칸을 고르면 param 이 바뀐다', () => {
    const { on바꿈 } = 그리기([{ kind: 'bind', param: 'orderId', value: 참조 }]);
    fireEvent.change(screen.getByLabelText('넣을 칸'), { target: { value: 'memo' } });
    expect(마지막(on바꿈)).toEqual([{ kind: 'bind', param: 'memo', value: 참조 }]);
  });
});

describe('ScenarioLinks 칸 아래 문장', () => {
  it('fromSeq 0 이면 빈 선택지가 골라진 채로 빠졌다는 문장이 나온다', () => {
    그리기([{ kind: 'reuse', method: 'GET', urlPattern: '/a', fromSeq: 0 }]);
    const 고르개 = screen.getByLabelText('가져올 단계') as HTMLSelectElement;
    expect(고르개.value).toBe('');
    expect(screen.getByText('가리키던 단계가 빠졌습니다')).toBeTruthy();
  });

  it('가리킨 단계가 멀쩡하면 그 문장이 없다', () => {
    그리기([{ kind: 'reuse', method: 'GET', urlPattern: '/a', fromSeq: 1 }]);
    expect(screen.queryByText('가리키던 단계가 빠졌습니다')).toBeNull();
  });

  it('빈 URL 패턴과 JSON 경로는 문장이 나오고 칸이 그 문장을 가리킨다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, urlPattern: '', jsonPath: '' } }]);
    const 무늬 = screen.getByLabelText('URL 패턴');
    const 경로 = screen.getByLabelText('JSON 경로');
    expect(document.getElementById(무늬.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'URL 패턴을 적어야 합니다',
    );
    expect(document.getElementById(경로.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'JSON 경로를 적어야 합니다',
    );
  });

  it('넣을 칸이 비면 골라야 한다는 문장이 나온다', () => {
    그리기([{ kind: 'bind', param: '', value: 참조 }]);
    expect(screen.getByText('넣을 칸을 골라야 합니다')).toBeTruthy();
    expect((screen.getByLabelText('넣을 칸') as HTMLSelectElement).value).toBe('');
  });

  it('수정 주소는 / 로 시작하고 {} 가 꼭 하나여야 문장이 사라진다', () => {
    const 문장 = '수정 주소는 / 로 시작하고 {} 자리가 하나 있어야 합니다';
    const 만들기 = (path: string): ScenarioLink => ({
      kind: 'rewrite',
      method: 'GET',
      urlPattern: '/a',
      to: { method: 'PATCH', path, value: 참조 },
    });
    for (const 나쁨 of ['/orders', '/orders/{}/{}', 'orders/{}', '//x/{}']) {
      그리기([만들기(나쁨)]);
      expect(screen.getByText(문장)).toBeTruthy();
      cleanup();
    }
    그리기([만들기('/orders/{}')]);
    expect(screen.queryByText(문장)).toBeNull();
  });
});

describe('ScenarioLinks 고치기 · 빼기', () => {
  it('칸을 고치면 즉시 kit 모양 그대로 올라간다', () => {
    const { on바꿈 } = 그리기([
      {
        kind: 'rewrite',
        method: 'GET',
        urlPattern: '/a',
        to: { method: 'PATCH', path: '/orders/{}', value: 참조 },
      },
    ]);
    const 묶음 = screen.getByRole('group', { name: '수정 요청으로 변경' });
    fireEvent.change(within(묶음).getByLabelText('수정 주소'), { target: { value: '/o/{}' } });
    expect(마지막(on바꿈)).toEqual([
      {
        kind: 'rewrite',
        method: 'GET',
        urlPattern: '/a',
        to: { method: 'PATCH', path: '/o/{}', value: 참조 },
      },
    ]);
    fireEvent.change(within(묶음).getByLabelText('바꿀 메서드'), { target: { value: 'PUT' } });
    expect(마지막(on바꿈)).toEqual([
      {
        kind: 'rewrite',
        method: 'GET',
        urlPattern: '/a',
        to: { method: 'PUT', path: '/orders/{}', value: 참조 },
      },
    ]);
    const 값묶음 = within(묶음).getByRole('group', { name: '가져올 값' });
    fireEvent.change(within(값묶음).getByLabelText('JSON 경로'), { target: { value: '$.no' } });
    expect(마지막(on바꿈)).toEqual([
      {
        kind: 'rewrite',
        method: 'GET',
        urlPattern: '/a',
        to: { method: 'PATCH', path: '/orders/{}', value: { ...참조, jsonPath: '$.no' } },
      },
    ]);
  });

  it('값 연결 빼기는 그 값 연결만 뺀 배열을 올린다', () => {
    const 첫째: ScenarioLink = { kind: 'block', method: 'GET', urlPattern: '/a' };
    const 둘째: ScenarioLink = { kind: 'reuse', method: 'POST', urlPattern: '/b', fromSeq: 1 };
    const { on바꿈 } = 그리기([첫째, 둘째]);
    const 묶음 = screen.getByRole('group', { name: '요청 차단' });
    fireEvent.click(within(묶음).getByRole('button', { name: '값 연결 빼기' }));
    expect(마지막(on바꿈)).toEqual([둘째]);
  });
});

describe('ScenarioLinks 읽기만', () => {
  it('쓰기가 아니면 추가 · 빼기 버튼이 없고 칸이 잠긴다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: 참조 }], { 쓰나: false });
    expect(screen.queryByRole('button', { name: '+ 값 연결 추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '값 연결 빼기' })).toBeNull();
    const 묶음 = screen.getByRole('group', { name: '값 주입' });
    const 칸들 = [...묶음.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')];
    expect(칸들).toHaveLength(5);
    for (const 칸 of 칸들) expect(칸.disabled).toBe(true);
  });
});
