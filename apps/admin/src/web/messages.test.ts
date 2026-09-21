import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { 글자 } from './i18n.js';
import { 말 } from './messages.js';

const 여기 = dirname(fileURLToPath(import.meta.url));

// 훑을 대상은 화면 코드뿐이다. 표 자신과 검사 파일은 `t(` 를 부르지 않거나 일부러 어긴 예를 담는다
function 화면파일들(폴더: string): string[] {
  return readdirSync(폴더).flatMap((이름) => {
    const 길 = join(폴더, 이름);
    if (statSync(길).isDirectory()) return 이름 === 'dist' || 이름 === 'messages' ? [] : 화면파일들(길);
    if (!/\.tsx?$/.test(이름) || /\.test\.tsx?$/.test(이름)) return [];
    if (이름 === 'i18n.ts' || 이름 === 'messages.ts') return [];
    return [길];
  });
}

const 소스 = 화면파일들(여기).map((길) => ({ 길, 글: readFileSync(길, 'utf8') }));

// 주석에는 한국어를 쓰라고 CLAUDE.md 가 시킨다. 그러니 재기 전에 주석부터 걷어낸다
function 주석없이(글: string): string {
  return 글.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
}

// 이 저장소는 **변수 이름도 한국어**다. 그래서 「한국어가 있다」만으로는 글자인지 코드인지 못 가른다.
// 코드로 보이는 것을 걸러 낸다 — 연산자가 들어 있으면 사람이 읽을 문장이 아니다
const 코드냄새 = /===|!==|&&|\|\||=>|\)|\(|\[|\]|\bnull\b|\bundefined\b|\.\w|\s[?:]\s/u;

const 한글리터럴 = /(['"])((?:[^'"\\\n]|\\.)*[가-힣](?:[^'"\\\n]|\\.)*)\1/gu;
const JSX글자 = />\s*([^<>{}\n]*[가-힣][^<>{}]*?)\s*</gu;

const 다듬 = (글: string): string => 글.replace(/\s+/gu, ' ').trim();

function 화면글자들(글: string): string[] {
  const 벗긴 = 주석없이(글);
  const 모음: string[] = [];
  for (const m of 벗긴.matchAll(한글리터럴)) if (m[2] !== undefined) 모음.push(다듬(m[2]));
  for (const m of 벗긴.matchAll(JSX글자)) if (m[1] !== undefined) 모음.push(다듬(m[1]));
  return 모음.filter((글) => 글 !== '' && !코드냄새.test(글));
}

/** 자리표(`${…}`)를 걷어낸 템플릿 문자열. 한국어 **식별자**는 여기서 사라진다 */
function 템플릿속글자(글: string): string[] {
  const 모음: string[] = [];
  for (const m of 주석없이(글).matchAll(/`((?:[^`\\]|\\.)*)`/gu)) {
    const 알맹이 = (m[1] ?? '').replace(/\$\{[^}]*\}/gu, '');
    if (/[가-힣]/u.test(알맹이)) 모음.push(다듬(m[0]));
  }
  return 모음;
}

// 번역 규칙은 실제 표와 떼어 놓고 잰다. 표가 자라도 이 단언들이 흔들리지 않는다
const 예시표 = { '진행 중': 'Running', '모두 {건수}건': 'All {건수}', '실행 (버튼)': 'Run', '실행 (집계)': 'Runs' };

describe('언어 표', () => {
  it('영어 표에 있는 글자는 영어로 낸다', () => {
    expect(글자('진행 중', 'en', 예시표)).toBe('Running');
  });

  it('한국어는 키가 곧 답이다. 표를 거치지 않는다', () => {
    expect(글자('진행 중', 'ko', 예시표)).toBe('진행 중');
  });

  it('영어 표에 없으면 한국어가 그대로 나온다. 빠진 번역이 화면을 깨지 않는다', () => {
    expect(글자('표에 아직 없는 글자', 'en', 예시표)).toBe('표에 아직 없는 글자');
  });

  it('값이 박힌 글자는 자리표를 값으로 바꾼다', () => {
    expect(글자('RUN {번호} 이 진행 중입니다 {끝난}/{전체}', 'ko', 예시표, { 번호: 12, 끝난: 3, 전체: 40 })).toBe(
      'RUN 12 이 진행 중입니다 3/40',
    );
  });

  it('영어로 낼 때도 자리표를 바꾼다', () => {
    expect(글자('모두 {건수}건', 'en', 예시표, { 건수: 42 })).toBe('All 42');
  });

  it('값을 안 주면 자리표를 그대로 둔다. 지어내지 않는다', () => {
    expect(글자('모두 {건수}건', 'ko', 예시표)).toBe('모두 {건수}건');
  });

  it('키 뒤의 괄호 꼬리는 화면에 나오지 않는다. 같은 한국어를 자리마다 다르게 번역하려고 붙인 것이다', () => {
    expect(글자('실행 (버튼)', 'ko', 예시표)).toBe('실행');
  });

  it('꼬리가 붙은 키도 영어 표를 탄다. 자리마다 다른 영어가 나온다', () => {
    expect(글자('실행 (버튼)', 'en', 예시표)).toBe('Run');
    expect(글자('실행 (집계)', 'en', 예시표)).toBe('Runs');
  });
});

// 「다 옮겼나」에 기계가 답하는 유일한 길이다.
// `t('…')` 호출만 세면 아직 안 감싼 글자는 세지도 못한다 — 남은 것을 세야 남은 것을 안다
describe('화면에 한국어가 남아 있으면 표에 있어야 한다', () => {
  it('소스의 모든 한국어 글자가 영어 표의 키다', () => {
    const 빠진것: string[] = [];
    for (const { 길, 글 } of 소스) {
      for (const 자 of 화면글자들(글)) if (!(자 in 말)) 빠진것.push(`${길.split('/web/')[1]}: ${자}`);
    }
    expect(빠진것).toEqual([]);
  });

  it('영어 표의 키가 전부 화면에 있다. 워딩을 고친 뒤 옛 키가 남지 않게', () => {
    const 있는것 = new Set(소스.flatMap(({ 글 }) => 화면글자들(글)));
    expect(Object.keys(말).filter((키) => !있는것.has(키.replace(/ \([^)]*\)$/u, '')))).toEqual([]);
  });

  // 값이 박힌 글자를 템플릿 문자열로 쓰면 키를 만들 수 없다. 자리표를 쓰게 만든다 —
  // 못 잡는 모양을 잡으려 애쓰는 대신 금지한다 (계획 게이트 1 BLOCKER 2)
  it('한국어가 든 템플릿 문자열이 하나도 없다', () => {
    const 어긴것: string[] = [];
    for (const { 길, 글 } of 소스) {
      for (const 자 of 템플릿속글자(글)) 어긴것.push(`${길.split('/web/')[1]}: ${자}`);
    }
    expect(어긴것).toEqual([]);
  });
});
