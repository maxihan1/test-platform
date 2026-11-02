// 실패 유형 나누기와 세기 — 글은 로컬 DB 에 실제로 남은 러너 · Playwright 오류 원문을 본떴다
import { describe, expect, it } from 'vitest';

import { 원인을가른다, 유형을센다 } from './failureType.js';

const 실패 = (itemMessage: string, assertFailed = false, stepMessage = '') =>
  원인을가른다({ status: 'FAIL', assertFailed, itemMessage, stepMessage });
const 미실행 = (itemMessage: string, stepMessage = '') => 원인을가른다({ status: 'NA', assertFailed: false, itemMessage, stepMessage });

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

  it('디바이스 팜이 없거나 폰을 못 내준 것도 환경 오류다 (APP-F1-10)', () => {
    expect(미실행('이 서버에는 디바이스 팜(DEVICE_FARM_URL)이 연결되어 있지 않습니다')).toBe('environment');
    expect(미실행('디바이스 팜에 빈 폰이 없습니다')).toBe('environment');
    expect(미실행('디바이스 팜이 폰을 내주지 않았습니다: 다른 사용자(maxi)가 쓰는 중')).toBe('environment');
    expect(미실행('디바이스 팜이 기기 목록을 주지 않았습니다 (HTTP 502)')).toBe('environment');
  });

  it('이름이 Device VISION 으로 바뀐 뒤의 문장도 환경 오류다 — 옛 문장(위)과 같이 가른다', () => {
    expect(미실행('이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다')).toBe('environment');
    expect(미실행('Device VISION 에 빈 폰이 없습니다')).toBe('environment');
    expect(미실행('Device VISION 이 폰을 내주지 않았습니다: 다른 사용자(maxi)가 쓰는 중')).toBe('environment');
  });

  it('기다리던 요소 이름에 「러너」가 들어 있어도 러너 고장이 아니라 요소 미검출이다', () => {
    expect(
      미실행('Test timeout of 30000ms exceeded.', "locator.click: Test timeout of 30000ms exceeded.\nCall log:\n  - waiting for getByText('러너 상태')"),
    ).toBe('notFound');
  });

  it('앱이 스스로 끊은 이동(net::ERR_ABORTED)은 환경 오류가 아니다', () => {
    expect(실패('page.goto: net::ERR_ABORTED at http://localhost:3002/login')).toBe('other');
  });

  it('실패한 테스트가 던진 한국어 오류는 러너 고장이 아니다', () => {
    expect(실패('Error: 러너 화면의 값이 비어 있다')).toBe('other');
  });

  it('실행이 멈춰 닫힌 미실행(ABORTED)은 유형이 아니라 멈춤이다', () => {
    expect(미실행('ABORTED')).toBe('stopped');
  });

  it('게임 드라이버가 켜진 오브젝트에서 못 찾은 것은 요소 미검출이다 (GAME-F1-09)', () => {
    expect(실패('켜진 오브젝트 중에 /Canvas/StartButton 이 없습니다')).toBe('notFound');
    expect(실패('켜진 오브젝트 중에 /Canvas/Shop 이 없습니다 (Shop 에서 끊김)')).toBe('notFound');
  });

  it('게임 드라이버의 기다림 초과와 답 없음은 타임아웃이다 (GAME-F1-09)', () => {
    expect(실패('/Canvas/Result 이 10초 안에 뜨지 않았습니다 (마지막: 없음)')).toBe('timeout');
    expect(실패('/Canvas/Loading 이 10초 안에 사라지지 않았습니다')).toBe('timeout');
    expect(실패('/Canvas/Gold 이 5초 안에 「120」이 되지 않았습니다 (마지막: 100)')).toBe('timeout');
    expect(실패('게임이 10초 안에 답하지 않았습니다')).toBe('timeout');
  });

  it('게임 연결이 끊기거나 팜이 명령을 거절한 것은 환경 오류다 (GAME-F1-09)', () => {
    expect(실패('게임 포트 13100 에 붙지 못했습니다 — QA 빌드가 켜져 있나요? (connect ECONNREFUSED)')).toBe('environment');
    expect(실패('게임이 답 없이 연결을 닫았습니다 — 폰에서 QA 빌드가 켜져 있고 포트 13100 를 여나요?')).toBe('environment');
    expect(실패('디바이스 팜이 게임 명령을 HTTP 409 로 거절했습니다: 잡은 사람이 아닙니다')).toBe('environment');
    expect(미실행('디바이스 팜이 게임 명령을 HTTP 502 로 거절했습니다')).toBe('environment');
    expect(미실행('Device VISION 이 게임 명령을 HTTP 502 로 거절했습니다')).toBe('environment');
  });

  it('켜지기를 기다리다 못 붙은 것은 시간 초과보다 먼저 환경 오류다 — 연결 끊김을 먼저 본다 (GAME-F1-09)', () => {
    expect(미실행('게임이 120초 안에 답하지 않았습니다 — 게임 포트 13100 에 붙지 못했습니다')).toBe('environment');
  });

  it('게임 문구가 있어도 확인 문장이 실패했으면 기대 결과 불일치가 먼저다 (GAME-F1-09)', () => {
    expect(실패('/Canvas/Result 이 10초 안에 뜨지 않았습니다', true)).toBe('mismatch');
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
