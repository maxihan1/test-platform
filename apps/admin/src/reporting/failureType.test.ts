// 실패 유형 나누기와 세기 — 글은 로컬 DB 에 실제로 남은 러너 · Playwright 오류 원문을 본떴다
import { describe, expect, it } from 'vitest';

import { 원인을가른다, 유형을센다 } from './failureType.js';

const 실패 = (message: string, assertFailed = false) => 원인을가른다({ status: 'FAIL', assertFailed, message });
const 미실행 = (message: string) => 원인을가른다({ status: 'NA', assertFailed: false, message });

describe('원인을가른다', () => {
  it('확인 문장이 실패했으면 오류 글과 상관없이 기대 결과 불일치다', () => {
    expect(실패('', true)).toBe('mismatch');
    expect(실패('locator.click: Timeout 30000ms exceeded.', true)).toBe('mismatch');
  });

  it('요소를 기다리다 테스트 제한 시간이 다 된 미실행은 요소 미검출이다 — 색 코드가 섞여도', () => {
    const 글 =
      "\u001b[31mTest timeout of 30000ms exceeded.\u001b[39m\nlocator.waitFor: Test timeout of 30000ms exceeded.\nCall log:\n\u001b[2m  - waiting for getByRole('link', { name: '주문 내역 내려받기' })\u001b[22m";
    expect(미실행(글)).toBe('notFound');
    expect(실패("locator.click: Timeout 10000ms exceeded.\nCall log:\n  - waiting for locator('#submit')")).toBe('notFound');
  });

  it('요소를 찾은 뒤 시간이 다 된 것은 타임아웃이다', () => {
    const 글 =
      "locator.click: Timeout 10000ms exceeded.\nCall log:\n  - waiting for locator('#submit')\n  - locator resolved to <button id=\"submit\">\n  - element is not visible";
    expect(실패(글)).toBe('timeout');
  });

  it('러너가 끊은 제한 시간 초과와 요소 대기 없는 테스트 제한 시간은 타임아웃이다', () => {
    expect(미실행('TIMEOUT')).toBe('timeout');
    expect(미실행('\u001b[31mTest timeout of 30000ms exceeded.\u001b[39m')).toBe('timeout');
    expect(실패('page.waitForURL: Timeout 30000ms exceeded.')).toBe('timeout');
  });

  it('대상 서버에 못 닿거나 러너가 고장 난 것은 환경 오류다', () => {
    expect(실패('page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3002/')).toBe('environment');
    expect(실패('TypeError: fetch failed')).toBe('environment');
    expect(미실행('러너에 닿지 못했습니다')).toBe('environment');
    expect(미실행('러너가 거절했다: CASE_NOT_FOUND — codyssey/CDY-FN-002.spec.ts')).toBe('environment');
  });

  it('실패한 테스트가 던진 한국어 오류는 러너 고장이 아니다', () => {
    expect(실패('Error: 러너 화면의 값이 비어 있다')).toBe('other');
  });

  it('사용자가 멈춘 미실행은 유형이 아니라 멈춤이다', () => {
    expect(미실행('ABORTED')).toBe('stopped');
  });

  it('넷에 안 맞는 것은 그 밖이다', () => {
    expect(실패("TypeError: Cannot read properties of undefined (reading 'id')")).toBe('other');
    expect(실패('Error: 테스트 계정 비밀값(loginId · password)이 비어 있다')).toBe('other');
    expect(미실행('')).toBe('other');
  });
});

describe('유형을센다', () => {
  it('유형마다 실패 · 미실행을 나눠 세고, 통과 줄과 원인 없는 줄은 건너뛰고, 멈춤은 따로 센다', () => {
    const 셈 = 유형을센다([
      { verdict: 'FAIL', cause: 'mismatch' },
      { verdict: 'FAIL', cause: 'notFound' },
      { verdict: 'NA', cause: 'notFound' },
      { verdict: 'NA', cause: 'notFound' },
      { verdict: 'NA', cause: 'stopped' },
      { verdict: 'FAIL', cause: null },
      { verdict: 'PASS', cause: null },
    ]);
    expect(셈).toEqual({
      유형별: [
        { type: 'mismatch', 실패: 1, 미실행: 0 },
        { type: 'notFound', 실패: 1, 미실행: 2 },
        { type: 'timeout', 실패: 0, 미실행: 0 },
        { type: 'environment', 실패: 0, 미실행: 0 },
        { type: 'other', 실패: 0, 미실행: 0 },
      ],
      멈춤: 1,
    });
  });
});
