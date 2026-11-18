// 종류 정하기 · 종류 입구 고르기 · 프롬프트 머리 검사 (도메인/작성 §3.6 「종류별 작성 AI」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 스킬고르기, 입구고르기, 작성종류 } from './authoring-kind.js';
import { 줄프롬프트 } from './authoring-prompt.js';

const 만든것: string[] = [];
/** 입구 스킬을 넣은 작업 폴더. `빈폴더` 는 SKILL.md 없이 폴더만 만든다 */
function 트리만들기(입구들: string[], 빈폴더: string[] = []): string {
  const 트리 = mkdtempSync(join(tmpdir(), 'kind-'));
  만든것.push(트리);
  for (const 이름 of [...입구들, ...빈폴더]) mkdirSync(join(트리, '.claude', 'skills', 이름), { recursive: true });
  for (const 이름 of 입구들) writeFileSync(join(트리, '.claude', 'skills', 이름, 'SKILL.md'), '입구');
  return 트리;
}
afterEach(() => {
  for (const 자리 of 만든것.splice(0)) rmSync(자리, { recursive: true, force: true });
});

describe('작성종류 — me 의 kind 하나로 정한다', () => {
  it('종류 넷을 입구 이름 꼬리로 바꾼다', () => {
    expect(['SCREEN', 'APP', 'API', 'GAME'].map(작성종류)).toEqual(['web', 'app', 'api', 'game']);
  });

  it('없거나 모르는 값이면 종류 없음이다', () => {
    expect([undefined, '', 'screen', 'DESKTOP', 'constructor'].map(작성종류)).toEqual([null, null, null, null, null]);
  });
});

describe('스킬고르기 — 작업 폴더에 입구가 있을 때만 종류 입구', () => {
  it('그 종류의 SKILL.md 가 있으면 종류 입구를 고른다', () => {
    expect(스킬고르기(트리만들기(['tpx-author-game']), 'game')).toEqual({ 스킬: 'tpx-author-game', 종류: 'game' });
  });

  it('입구가 없으면 옛 입구이고 종류도 안 싣는다', () => {
    expect(스킬고르기(트리만들기([]), 'game')).toEqual({ 스킬: 'tpx-author' });
  });

  it('다른 종류의 입구만 있거나 폴더만 있고 SKILL.md 가 없으면 옛 입구다', () => {
    expect(스킬고르기(트리만들기(['tpx-author-web']), 'game')).toEqual({ 스킬: 'tpx-author' });
    expect(스킬고르기(트리만들기([], ['tpx-author-game']), 'game')).toEqual({ 스킬: 'tpx-author' });
  });

  it('종류가 없으면 입구가 다 있어도 옛 입구다', () => {
    expect(스킬고르기(트리만들기(['tpx-author-web', 'tpx-author-app', 'tpx-author-api', 'tpx-author-game']), null)).toEqual({ 스킬: 'tpx-author' });
  });
});

describe('입구고르기 — 종류를 못 읽으면 로그에 남긴다', () => {
  it('종류를 못 읽으면 한 번 알리고 옛 입구로 간다', () => {
    const 알림 = vi.fn();
    expect(입구고르기(트리만들기(['tpx-author-web']), 'DESKTOP', 알림)).toEqual({ 스킬: 'tpx-author' });
    expect(알림).toHaveBeenCalledTimes(1);
    expect(알림.mock.calls[0]?.[0]).toContain('kind="DESKTOP"');
  });

  it('종류를 읽었으면 입구가 없어도 알리지 않는다', () => {
    const 알림 = vi.fn();
    expect(입구고르기(트리만들기([]), 'GAME', 알림)).toEqual({ 스킬: 'tpx-author' });
    expect(알림).not.toHaveBeenCalled();
  });

  it('작업 폴더를 안 받았으면 알리지 않고 옛 입구다', () => {
    const 알림 = vi.fn();
    expect(입구고르기(undefined, undefined, 알림)).toEqual({ 스킬: 'tpx-author' });
    expect(알림).not.toHaveBeenCalled();
  });
});

describe('줄프롬프트 — 종류 입구 (도메인/작성 §3.6 「종류별 작성 AI」)', () => {
  const 것 = { id: 1, kind: 'AUTHOR' as const, specText: '본문' };
  const 대상 = { 폴더: 'mkt', 서버들: [{ env: 'qa', baseUrl: 'https://qa.mkt.test' }] };
  const 앱화면 = { 글: '첫 화면' };
  const 글 = (더: { 트리?: string; 종류?: string }, 화면?: typeof 앱화면) =>
    줄프롬프트(것, 'MKT', [], { ...대상, ...더 }, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 화면);

  it('작업 폴더에 입구가 없으면 종류를 받아도 지금 프롬프트와 글자 하나 안 다르다', () => {
    const 지금 = 글({});
    expect(지금.split('\n')[0]).toBe('/tpx-author 아래 자료로 테스트케이스를 만들어줘. tcId 접두사는 MKT 다.');
    expect(지금).toContain('\n- tpx-author 스킬을 따라라. 다른 체인 스킬은 부르지 마라.\n');
    expect(지금).not.toContain('이 애플리케이션은 종류');
    for (const 종류 of ['SCREEN', 'APP', 'API', 'GAME']) expect(글({ 트리: 트리만들기([]), 종류 }, 앱화면)).toBe(글({}, 앱화면));
  });

  it('입구가 있으면 첫 줄이 그 입구이고 종류 줄을 적는다', () => {
    const 게임 = 글({ 트리: 트리만들기(['tpx-author-game']), 종류: 'GAME' });
    expect(게임.split('\n')[0]).toBe('/tpx-author-game 아래 자료로 테스트케이스를 만들어줘. tcId 접두사는 MKT 다.');
    expect(게임).toContain('\n- 이 애플리케이션은 종류 「게임」이다. tpx-author-game 스킬을 따라라. 다른 체인 스킬은 부르지 마라.\n');
    expect(글({ 트리: 트리만들기(['tpx-author-app']), 종류: 'APP' })).toContain('종류 「Android 앱」이다. tpx-author-app 스킬을 따라라');
  });

  it('API 칸 없이 온 API 애플리케이션 요청도 API 입구를 탄다', () => {
    expect(글({ 트리: 트리만들기(['tpx-author-api']), 종류: 'API' })).toContain('종류 「API」이다. tpx-author-api 스킬을 따라라');
  });

  it('웹에 앱 화면 절이 붙었을 때만 앱 파일을 더 열라고 적는다', () => {
    const 트리 = 트리만들기(['tpx-author-web', 'tpx-author-app']);
    const 줄 = '- 아래에 「앱 화면」 절이 붙었다.';
    expect(글({ 트리, 종류: 'SCREEN' }, 앱화면)).toContain(줄);
    expect(글({ 트리, 종류: 'SCREEN' })).not.toContain(줄);
    expect(글({ 트리, 종류: 'APP' }, 앱화면)).not.toContain(줄);
  });
});
