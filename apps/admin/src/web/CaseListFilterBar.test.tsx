// @vitest-environment jsdom
// 케이스 목록 필터 판 · 고른 조건 칩 (도메인/카탈로그 §8.1 「검색 조건」 · DESIGN.md 「필터 판」 · WEB-F7-07)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { TECHNIQUES } from '@platform/kit/types';

import type { 앱종류 } from './api.js';
import { use검색조건 } from './CaseListFilter.js';
import { 판열기, 판조건, 판칩누르기, 필터단추 } from './CaseListFilterBar.fixture.js';
import { 고른조건칩들, use필터조건들, 필터판 } from './CaseListFilterBar.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  window.location.hash = '#/cases/fn';
});

function 그리기({ kind = 'FN', 앱있음 = false, 앱종류, 서버목록 = [] }: { kind?: 'UI' | 'FN'; 앱있음?: boolean; 앱종류?: 앱종류; 서버목록?: { name: string; count: number }[] } = {}) {
  let 조건 = {};
  function 판() {
    const 검색 = use검색조건('ZFB', kind, undefined, 앱종류);
    const 조건들 = use필터조건들(검색, { kind, 앱있음, 앱종류, 서버목록 });
    조건 = 검색.조건;
    return (
      <>
        <고른조건칩들 조건들={조건들} />
        <p>바깥</p>
        <필터판 조건들={조건들} 건수={7} />
      </>
    );
  }
  render(<판 />);
  return { 조건: () => 조건 };
}

const 걸린칩글 = () => [...document.querySelectorAll('.filter-on')].map((el) => el.firstChild?.textContent);

describe('필터 판 — 고르면 바로 적용된다', () => {
  it('조건을 고르면 판이 열린 채 질의가 바뀌고, 표 위 칩과 단추의 수가 붙는다', () => {
    const { 조건 } = 그리기();
    expect(필터단추().textContent).toBe('필터');

    판칩누르기('설계 기법', '경계값 분석');

    expect(screen.getByRole('dialog', { name: '필터' })).toBeTruthy();
    expect(조건()).toMatchObject({ technique: '경계값 분석' });
    expect(걸린칩글()).toEqual(['설계 기법 경계값 분석']);
    expect(필터단추().textContent).toBe('필터 1');
  });

  it('칩의 ✕ 는 그 조건만 푼다', () => {
    const { 조건 } = 그리기();
    판칩누르기('설계 기법', '경계값 분석');
    판칩누르기('종류', '예외');

    fireEvent.click(screen.getByRole('button', { name: '종류 예외 조건 풀기' }));

    expect(조건()).not.toHaveProperty('axis');
    expect(조건()).toMatchObject({ technique: '경계값 분석' });
  });

  it('조건 초기화는 판의 조건만 푼다 — 결과 탭(last)은 그대로다', () => {
    window.location.hash = '#/cases/fn?last=FAIL&tech=%EA%B2%BD%EA%B3%84%EA%B0%92+%EB%B6%84%EC%84%9D&all=1';
    const { 조건 } = 그리기();

    fireEvent.click(within(판열기()).getByRole('button', { name: '조건 초기화' }));

    expect(조건()).toMatchObject({ last: 'FAIL' });
    expect(조건()).not.toHaveProperty('technique');
    expect(조건()).not.toHaveProperty('active');
    expect(걸린칩글()).toEqual([]);
  });

  it('조건마다 한 줄 설명이 붙는다', () => {
    그리기();
    expect(within(판조건('표시')).getByText('비활성 케이스는 「활성만」에서 숨기고 실행에서도 뺍니다')).toBeTruthy();
  });

  it('설계 기법 칩은 전체 · kit 기법 차례 · 기법 없음이다', () => {
    그리기();
    expect(within(판조건('설계 기법')).getAllByRole('button').map((el) => el.textContent)).toEqual(['전체', ...TECHNIQUES, '기법 없음']);
  });
});

describe('필터 판 — 닫기', () => {
  it('Esc 로 닫히고 포커스가 필터 단추로 돌아온다', () => {
    그리기();
    const 판 = 판열기();

    fireEvent.keyDown(판, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(필터단추());
  });

  it('바깥을 누르면 닫히고 판 안을 누르면 안 닫힌다', () => {
    그리기();
    fireEvent.pointerDown(판조건('표시'));
    expect(screen.queryByRole('dialog')).not.toBeNull();

    fireEvent.pointerDown(screen.getByText('바깥'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('휴대폰에서는 맨 아래 「N건 보기」를 누르면 닫힌다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    그리기();

    fireEvent.click(within(판열기()).getByRole('button', { name: '7건 보기' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('디바이스 줄 — 「Android 앱」은 앱 케이스가 있는 애플리케이션에만 (APP-F1-04)', () => {
  const 앱칩 = () => within(판조건('디바이스')).queryByRole('button', { name: 'Android 앱' });

  it('앱 케이스가 없으면 칩이 없고, 있으면 선다', () => {
    그리기();
    expect(앱칩()).toBeNull();
    cleanup();
    그리기({ 앱있음: true });
    expect(앱칩()).toBeTruthy();
  });

  it('주소로 android 를 고른 채 들어오면 앱 케이스가 없어도 칩이 눌린 채 선다 — 고른 것을 감추지 않는다', () => {
    window.location.hash = '#/cases/fn?dev=android';
    그리기();
    expect(앱칩()?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('API 서버 줄', () => {
  it('이름이 없으면 줄이 없어도, 주소에 남은 이름은 표 위 칩으로 남는다', () => {
    window.location.hash = '#/cases/fn?api=%EC%98%9B%EC%9D%B4%EB%A6%84';
    그리기();
    expect(within(판열기()).queryByRole('group', { name: 'API 서버' })).toBeNull();
    expect(걸린칩글()).toEqual(['API 서버 옛이름']);
  });
});
