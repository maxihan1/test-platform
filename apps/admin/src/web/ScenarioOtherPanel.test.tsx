// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ④ 검사 — API · 모킹 · 모킹 끄기 · 대기 단계 설정 패널 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';

afterEach(cleanup);

type 다른단계 = Exclude<ScenarioPart, { kind: 'case' }>;

const api = (덮: Partial<Extract<ScenarioPart, { kind: 'api' }>> = {}): 다른단계 => ({
  kind: 'api',
  method: 'GET',
  path: '/api/x',
  expectStatus: 200,
  ...덮,
});
const 모킹 = (urlPattern: string): 다른단계 => ({
  kind: 'mock',
  urlPattern,
  status: 500,
  contentType: 'application/json',
  body: '{}',
});
const 끄기 = (urlPattern: string): 다른단계 => ({ kind: 'unmock', urlPattern });
const 대기 = (ms: number): 다른단계 => ({ kind: 'wait', ms });

function 그리기(현재: 다른단계, 옵션: { 쓰나?: boolean; 번호?: number; 단계들?: ScenarioPart[] } = {}) {
  const on바꿈 = vi.fn();
  render(
    <ScenarioOtherPanel
      번호={옵션.번호 ?? 1}
      단계={현재}
      단계들={옵션.단계들 ?? [현재]}
      쓰나={옵션.쓰나 ?? true}
      on바꿈={on바꿈}
    />,
  );
  return on바꿈;
}

const 마지막 = (f: ReturnType<typeof vi.fn>) => f.mock.calls.at(-1)?.[0] as 다른단계;
const 입력 = (라벨: string, 글: string) => fireEvent.change(screen.getByLabelText(라벨), { target: { value: 글 } });

const 경로문장 = '경로는 / 로 시작하고 // 로 시작하지 않아야 합니다';
const 코드문장 = '응답 코드는 100부터 599까지입니다';
const 시간문장 = '1초부터 60초까지 기다릴 수 있습니다';

describe('ScenarioOtherPanel API', () => {
  it('머리에 종류 이름이 나오고 칸을 고치면 단계가 바뀐다', () => {
    const on바꿈 = 그리기(api());
    expect(screen.getByText('API 호출')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('메서드'), { target: { value: 'POST' } });
    expect(마지막(on바꿈)).toEqual({ kind: 'api', method: 'POST', path: '/api/x', expectStatus: 200 });
    입력('경로', '/api/y');
    expect(마지막(on바꿈)).toMatchObject({ path: '/api/y' });
    입력('기대 응답 코드', '201');
    expect(마지막(on바꿈)).toMatchObject({ expectStatus: 201 });
  });

  it('경로가 / 로 시작하지 않거나 // 로 시작하면 문장이 나오고 맞으면 사라진다', () => {
    그리기(api());
    expect(screen.queryByText(경로문장)).toBeNull();
    입력('경로', 'api/x');
    expect(screen.getByText(경로문장)).toBeTruthy();
    입력('경로', '//x');
    expect(screen.getByText(경로문장)).toBeTruthy();
    입력('경로', '/x');
    expect(screen.queryByText(경로문장)).toBeNull();
  });

  it('규칙에 어긋난 경로도 글자 그대로 반영하고 문장은 칸에 잇는다', () => {
    const on바꿈 = 그리기(api());
    입력('경로', 'api/x');
    expect(마지막(on바꿈)).toMatchObject({ path: 'api/x' });
    const 칸 = screen.getByLabelText('경로');
    expect(document.getElementById(칸.getAttribute('aria-describedby') ?? '')?.textContent).toBe(경로문장);
  });

  it('본문을 JSON 으로 못 읽으면 문장만 나오고 읽히면 반영하며 비우면 body 키가 빠진다', () => {
    const on바꿈 = 그리기(api());
    입력('본문', '{');
    expect(screen.getByText('본문을 JSON 으로 읽지 못했습니다')).toBeTruthy();
    expect(on바꿈).not.toHaveBeenCalled();

    입력('본문', '{"a":1}');
    expect(screen.queryByText('본문을 JSON 으로 읽지 못했습니다')).toBeNull();
    expect(마지막(on바꿈)).toMatchObject({ body: { a: 1 } });

    입력('본문', '');
    expect('body' in 마지막(on바꿈)).toBe(false);
  });

  it('기대 응답 코드는 100 부터 599 까지의 정수만 반영한다', () => {
    const on바꿈 = 그리기(api());
    입력('기대 응답 코드', '99');
    expect(screen.getByText(코드문장)).toBeTruthy();
    입력('기대 응답 코드', '600');
    입력('기대 응답 코드', '20.5');
    expect(on바꿈).not.toHaveBeenCalled();
    입력('기대 응답 코드', '404');
    expect(screen.queryByText(코드문장)).toBeNull();
    expect(마지막(on바꿈)).toMatchObject({ expectStatus: 404 });
  });

  it('모킹이 걸린 구간 안의 API 단계에만 모킹되지 않는다는 안내가 나온다', () => {
    const 안내 = '이 단계의 API 호출은 모킹되지 않습니다';
    그리기(api(), { 번호: 2, 단계들: [모킹('**/api/x'), api()] });
    expect(screen.getByText(안내)).toBeTruthy();
    cleanup();
    그리기(api(), { 번호: 1, 단계들: [api(), 모킹('**/api/x')] });
    expect(screen.queryByText(안내)).toBeNull();
  });
});

describe('ScenarioOtherPanel 모킹 켜기', () => {
  it('칸을 고치면 단계가 바뀌고 응답 본문은 글자 그대로 간다', () => {
    const on바꿈 = 그리기(모킹('**/api/pay'));
    expect(screen.getByText('모킹 켜기')).toBeTruthy();

    입력('URL 패턴', '**/api/order');
    expect(마지막(on바꿈)).toMatchObject({ urlPattern: '**/api/order' });
    입력('응답 코드', '503');
    expect(마지막(on바꿈)).toMatchObject({ status: 503 });
    입력('응답 형식', 'text/plain');
    expect(마지막(on바꿈)).toMatchObject({ contentType: 'text/plain' });
    입력('응답 본문', '{ 아님');
    expect(마지막(on바꿈)).toMatchObject({ body: '{ 아님' });
    expect(screen.queryByText('본문을 JSON 으로 읽지 못했습니다')).toBeNull();
  });

  it('URL 패턴이 비면 문장이 나오고 응답 코드가 틀리면 문장만 나온다', () => {
    const on바꿈 = 그리기(모킹('**/api/pay'));
    입력('URL 패턴', '');
    expect(screen.getByText('URL 패턴을 적어야 합니다')).toBeTruthy();
    입력('응답 코드', '1000');
    expect(screen.getByText(코드문장)).toBeTruthy();
    expect(마지막(on바꿈)).toMatchObject({ urlPattern: '', status: 500 });
  });
});

describe('ScenarioOtherPanel 모킹 끄기', () => {
  it('선택지는 앞에서 켠 무늬뿐이고 고르면 단계가 바뀐다', () => {
    const on바꿈 = 그리기(끄기('**/b'), { 번호: 3, 단계들: [모킹('**/a'), 모킹('**/b'), 끄기('**/b')] });
    expect(screen.getByText('모킹 끄기')).toBeTruthy();
    const 고르개 = screen.getByLabelText('끌 모킹') as HTMLSelectElement;
    expect([...고르개.options].map((o) => o.value)).toEqual(['**/a', '**/b']);
    expect(screen.queryByText('앞에서 켜지 않은 모킹입니다')).toBeNull();

    fireEvent.change(고르개, { target: { value: '**/a' } });
    expect(마지막(on바꿈)).toEqual({ kind: 'unmock', urlPattern: '**/a' });
  });

  it('앞에서 켠 것이 하나도 없으면 문장이 나온다', () => {
    그리기(끄기(''), { 번호: 1, 단계들: [끄기('')] });
    expect(screen.getByText('앞에서 켠 모킹이 없습니다')).toBeTruthy();
  });

  it('지금 값이 앞에 없으면 그 값도 선택지에 남기고 문장을 보인다', () => {
    그리기(끄기('**/z'), { 번호: 2, 단계들: [모킹('**/a'), 끄기('**/z')] });
    const 고르개 = screen.getByLabelText('끌 모킹') as HTMLSelectElement;
    expect([...고르개.options].map((o) => o.value)).toEqual(['**/a', '**/z']);
    expect(고르개.value).toBe('**/z');
    expect(screen.getByText('앞에서 켜지 않은 모킹입니다')).toBeTruthy();
  });
});

describe('ScenarioOtherPanel 대기', () => {
  it('초 단위로 보이고 고치면 ms 로 바뀐다', () => {
    const on바꿈 = 그리기(대기(3000));
    expect(screen.getByText('대기')).toBeTruthy();
    expect((screen.getByLabelText('기다릴 시간(초)') as HTMLInputElement).value).toBe('3');
    입력('기다릴 시간(초)', '2');
    expect(마지막(on바꿈)).toEqual({ kind: 'wait', ms: 2000 });
  });

  it('0 · 61 · 1.5 는 문장만 나오고 반영하지 않는다', () => {
    const on바꿈 = 그리기(대기(3000));
    for (const 글 of ['0', '61', '1.5']) {
      입력('기다릴 시간(초)', 글);
      expect(screen.getByText(시간문장)).toBeTruthy();
    }
    expect(on바꿈).not.toHaveBeenCalled();
    입력('기다릴 시간(초)', '60');
    expect(screen.queryByText(시간문장)).toBeNull();
    expect(마지막(on바꿈)).toEqual({ kind: 'wait', ms: 60000 });
  });
});

describe('ScenarioOtherPanel 권한', () => {
  it('쓰기 아니면 모든 칸이 잠긴다', () => {
    그리기(api({ body: { a: 1 } }), { 쓰나: false });
    for (const 라벨 of ['메서드', '경로', '본문', '기대 응답 코드']) {
      expect((screen.getByLabelText(라벨) as HTMLInputElement).disabled).toBe(true);
    }
    cleanup();
    그리기(모킹('**/a'), { 쓰나: false });
    for (const 라벨 of ['URL 패턴', '응답 코드', '응답 형식', '응답 본문']) {
      expect((screen.getByLabelText(라벨) as HTMLInputElement).disabled).toBe(true);
    }
    cleanup();
    그리기(끄기('**/a'), { 쓰나: false, 단계들: [모킹('**/a'), 끄기('**/a')], 번호: 2 });
    expect((screen.getByLabelText('끌 모킹') as HTMLSelectElement).disabled).toBe(true);
    cleanup();
    그리기(대기(1000), { 쓰나: false });
    expect((screen.getByLabelText('기다릴 시간(초)') as HTMLInputElement).disabled).toBe(true);
  });
});
