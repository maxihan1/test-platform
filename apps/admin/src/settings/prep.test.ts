// 준비 주소 칸 규칙 — 칸 검사 · 이어받기 · 실서비스 거절 · DB 읽기 (도메인/인증 §7 envs[] prep · SEED-F1-02)

import { describe, expect, it } from 'vitest';

import { 설정오류 } from './errors.js';
import { 준비이어받기, 준비읽기, 준비틀림 } from './prep.js';

const 값 = 'seed-prep-secret-7781';
const 옛것 = { url: 'https://qa.example.com/prep', header: 'X-Prep-Key', value: 값, timeoutSec: 90 };

const 오류코드 = (f: () => unknown): string | null => {
  try {
    f();
    return null;
  } catch (e) {
    return e instanceof 설정오류 ? e.code : String(e);
  }
};

describe('준비 주소 칸 규칙 (도메인/인증 §7 envs[] prep)', () => {
  it('http(s) 주소 · 영문 머리 · 12자 넘는 값 · 10~600초 정수만 받는다', () => {
    const 맞음 = { url: 'https://qa.example.com/prep', header: 'X-Prep-Key', value: 값, timeoutSec: 600 };
    expect(준비틀림([{ prep: 맞음 }, { prep: null }, {}])).toBe(false);
    for (const 틀림 of [
      { ...맞음, url: 'ftp://qa.example.com/prep' },
      { ...맞음, url: `https://qa.example.com/${'a'.repeat(1000)}` },
      { ...맞음, header: 'X Prep' },
      { ...맞음, header: '' },
      { ...맞음, value: 'short' },
      { ...맞음, value: `${값}한글` },
      { ...맞음, timeoutSec: 9 },
      { ...맞음, timeoutSec: 601 },
      { ...맞음, timeoutSec: 12.5 },
    ]) {
      expect(준비틀림([{ prep: 틀림 }])).toBe(true);
    }
  });

  it('값 없이 같은 주소 · 머리를 보내면 옛 값을 잇고, 시간 한도를 안 보내면 120초다', () => {
    expect(준비이어받기({ url: ' https://qa.example.com/prep ', header: ' X-Prep-Key ' }, 옛것, false)).toEqual({ ...옛것, timeoutSec: 120 });
  });

  it('주소나 머리를 바꾸면서 값을 안 보내면 PREP_VALUE_REQUIRED 다', () => {
    expect(오류코드(() => 준비이어받기({ url: 'https://other.example.com/prep', header: 'X-Prep-Key' }, 옛것, false))).toBe('PREP_VALUE_REQUIRED');
    expect(오류코드(() => 준비이어받기({ url: 옛것.url, header: 'X-Other' }, 옛것, false))).toBe('PREP_VALUE_REQUIRED');
    expect(오류코드(() => 준비이어받기({ url: 옛것.url, header: 옛것.header }, null, false))).toBe('PREP_VALUE_REQUIRED');
  });

  it('키가 없으면 옛 값, null 이면 지운다', () => {
    expect(준비이어받기(undefined, 옛것, false)).toEqual(옛것);
    expect(준비이어받기(null, 옛것, false)).toBeNull();
  });

  it('실서비스 서버 줄에 준비가 남으면 PREP_ON_PROD 다 — 키를 안 보내 옛 값이 남아도 같다', () => {
    expect(오류코드(() => 준비이어받기({ ...옛것 }, null, true))).toBe('PREP_ON_PROD');
    expect(오류코드(() => 준비이어받기({ url: 'https://other.example.com/prep', header: 'X-Prep-Key' }, null, true))).toBe('PREP_ON_PROD');
    expect(오류코드(() => 준비이어받기(undefined, 옛것, true))).toBe('PREP_ON_PROD');
    expect(준비이어받기(null, 옛것, true)).toBeNull();
    expect(준비이어받기(undefined, null, true)).toBeNull();
  });

  it('DB 에서 읽은 모양이 어긋나면 없는 것으로 읽고, 시간 한도가 없으면 120초다', () => {
    expect(준비읽기(null)).toBeNull();
    expect(준비읽기({ url: 옛것.url, header: 옛것.header })).toBeNull();
    expect(준비읽기({ url: 옛것.url, header: 옛것.header, value: 값 })).toEqual({ ...옛것, timeoutSec: 120 });
  });
});
