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

// `obj.t(`·`split(`·`format(` 에 걸리지 않게 앞 글자를 막는다
const 모든부름 = /(?<![\w$.])t\s*\(/gu;
const 리터럴부름 = /(?<![\w$.])t\s*\(\s*(['"])((?:[^'"\\]|\\.)*)\1/gu;

function 센다(글: string, 정규식: RegExp): number {
  return [...글.matchAll(new RegExp(정규식.source, 정규식.flags))].length;
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

describe('표와 소스가 어긋나지 않는다', () => {
  it('화면이 부르는 키가 전부 영어 표에 있다', () => {
    const 빠진것: string[] = [];
    for (const { 길, 글 } of 소스) {
      for (const 맞음 of 글.matchAll(리터럴부름)) {
        const 키 = 맞음[2];
        if (키 !== undefined && 키 !== '' && !(키 in 말)) 빠진것.push(`${길}: ${키}`);
      }
    }
    expect(빠진것).toEqual([]);
  });

  it('영어 표의 키가 전부 화면에 쓰인다. 워딩을 고친 뒤 옛 키가 남지 않게', () => {
    const 쓰인키 = new Set<string>();
    for (const { 글 } of 소스) {
      for (const 맞음 of 글.matchAll(리터럴부름)) {
        if (맞음[2] !== undefined) 쓰인키.add(맞음[2]);
      }
    }
    expect(Object.keys(말).filter((키) => !쓰인키.has(키))).toEqual([]);
  });

  // 정규식은 템플릿 문자열을 못 잡는다. 그래서 잡으려 하지 않고 금지한다 —
  // 못 잡는 모양이 나타나면 그 자체로 빨개진다 (계획 게이트 1 BLOCKER 2)
  it('키가 아닌 것을 t() 에 넣은 자리가 하나도 없다', () => {
    const 어긴것: string[] = [];
    for (const { 길, 글 } of 소스) {
      const 차이 = 센다(글, 모든부름) - 센다(글, 리터럴부름);
      if (차이 > 0) 어긴것.push(`${길}: ${차이}곳`);
    }
    expect(어긴것).toEqual([]);
  });
});
