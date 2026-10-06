// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ⑤ 검사 — 값 연결 칸 아래 문장 · 고치기 · 빼기 · 읽기만 (도메인/시나리오 §8.11)

import type { ScenarioLink } from '@platform/kit';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { 참조, 그리기, 마지막 } from './ScenarioLinks.fixture.js';

afterEach(cleanup);

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
