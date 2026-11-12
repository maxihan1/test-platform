// 안정화 지표의 메시지 틀 · 지문 — 같은 오류를 하나로 묶는다 (도메인/안정화 §3.15 「지문」)
// 지문에 대상 서버를 넣지 않는다 — 서버마다 묶는 일은 stab_error 의 (service_id, env, fingerprint) 고유 키가 맡는다

import { createHash } from 'node:crypto';

import { API틀 } from '../prd/apiMap.js';

export type 오류출처 = 'WEB_PAGEERROR' | 'WEB_CONSOLE' | 'WEB_NETWORK' | 'APP_CRASH' | 'APP_ANR' | 'GAME_EXCEPTION';

export interface 지문 {
  source: 오류출처;
  fingerprint: string;
  title: string;
  message: string | null;
}

const 해시 = (...재료: string[]): string => createHash('sha256').update(재료.join('\n')).digest('hex');
const 앞 = (글: string, 상한: number): string => (글.length > 상한 ? `${글.slice(0, 상한)}…` : 글);

/** 값이 바뀔 때마다 지문이 갈라지지 않게 숫자 · uuid · 긴 16진 · 따옴표 안 값 · 물음표 뒤를 `*` 로 (Drain 꼴을 한 줄로 줄였다) */
export function 메시지틀(글: string): string {
  return 글
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '*')
    .replace(/\b[0-9a-f]{17,}\b/gi, '*')
    // 글자 바로 뒤의 ' 는 줄임표(can't · it's)라 따옴표로 보지 않는다
    .replace(/"[^"\n]*"|(?<!\w)'[^'\n]*'|`[^`\n]*`/g, (m) => `${m[0]}*${m[0]}`)
    // 주소의 물음표만 — 경로(/) 뒤에 온 것. a?.b 같은 코드 조각은 그대로 둔다
    .replace(/(\/[^\s?"'`]*)\?[^\s"'`]+/g, '$1?*')
    .replace(/\d+/g, '*')
    .slice(0, 200);
}

/** 서비스 지도와 같은 주소 틀의 host + path. http(s) 가 아니면 `data:` 꼴 한 낱말 — 같은 경로라도 다른 호스트는 다른 오류다 */
export function 주소틀(url: string): string {
  const 틀 = API틀(url);
  return 틀 === null ? 프로토콜(url) : `${틀.host}${틀.path}`;
}

const 경로 = (url: string): string => API틀(url)?.path ?? 프로토콜(url);
const 프로토콜 = (url: string): string => {
  const m = /^([a-z][\w+.-]*):/i.exec(url);
  return m === null ? '' : `${m[1]!.toLowerCase()}:`;
};

/** pageerror 글은 스택 전체다 — 압축 JS 스택은 빌드마다 바뀌어 첫 줄(오류 이름 + 메시지)만 쓴다 */
export function 웹콘솔지문(level: 'pageerror' | 'error', 글: string, 화면주소: string): 지문 {
  const 틀 = 메시지틀(글.split('\n', 1)[0]!.trim());
  const 이름 = /^([A-Z][\w$]*(?:Error|Exception)):?\s*/.exec(틀);
  return {
    source: level === 'pageerror' ? 'WEB_PAGEERROR' : 'WEB_CONSOLE',
    fingerprint: 해시(level, 틀, 주소틀(화면주소)),
    title: 이름 === null ? `콘솔 오류 · ${앞(틀, 80)}` : `${이름[1]} · ${앞(틀.slice(이름[0].length), 80)}`,
    message: 틀,
  };
}

/** status 가 null 이면 응답 없이 끊긴 요청이다 */
export function 웹네트워크지문(status: number | null, method: string, url: string, 화면주소: string): 지문 {
  const 종류 = status === null ? '요청 끊김' : `HTTP ${status}`;
  const m = method.toUpperCase();
  return {
    source: 'WEB_NETWORK',
    fingerprint: 해시(종류, m, 주소틀(url), 주소틀(화면주소)),
    title: `${종류} · ${m} ${경로(url)}`,
    message: null,
  };
}

// `at com.x.Foo.bar(Foo.kt:42)` · `Unity.BossRoom.ClientCharacter.OnAnimEvent (System.String id) [0x0001] in <…>:0` → 이름만. 줄 번호 · 파일 · 인자를 뺀다
const 프레임이름 = (줄: string): string => 줄.trim().replace(/^at\s+/, '').split(/\s*[([]/, 1)[0]!.trim();
const 끝두칸 = (이름: string): string => 이름.split('.').slice(-2).join('.');
// 컴파일러가 붙이는 번호(익명 클래스 Foo$1 · 람다 $$ExternalSyntheticLambda3 · C# <Run>b__12_0)는 빌드마다 바뀌어 지문 재료에서만 접는다
const 번호접기 = (이름: string): string => 이름.replace(/\d+/g, '*');
const 프레임셋 = (줄들: readonly string[], 고르기: (이름: string) => boolean): string[] => {
  const 이름들 = 줄들.map(프레임이름).filter((x) => x !== '');
  const 고른 = 이름들.filter(고르기);
  return (고른.length > 0 ? 고른 : 이름들).slice(0, 3);
};

/** 예외 클래스 + 앱 패키지로 시작하는 프레임 셋(없으면 맨 위 셋). 프레임 줄은 logcat 의 `at …` 줄 그대로 받는다 */
export function 앱크래시지문(패키지: string, 예외클래스: string, 프레임줄: readonly string[]): 지문 {
  const 프레임 = 프레임셋(프레임줄, (x) => x.startsWith(`${패키지}.`));
  const 짧은예외 = 예외클래스.split('.').at(-1)!;
  return {
    source: 'APP_CRASH',
    fingerprint: 해시(예외클래스, ...프레임.map(번호접기)),
    title: 프레임.length === 0 ? 짧은예외 : `${짧은예외} · ${끝두칸(프레임[0]!)}`,
    message: 예외클래스,
  };
}

export function 앱ANR지문(패키지: string, 액티비티: string | null, 까닭: string): 지문 {
  const 틀 = 메시지틀(까닭);
  return {
    source: 'APP_ANR',
    fingerprint: 해시('ANR', 패키지, 액티비티 ?? '', 틀),
    title: `ANR · ${액티비티 === null ? 패키지 : 액티비티.split(/[./]/).at(-1)!}`,
    message: 틀,
  };
}

const 엔진프레임 = /^(?:UnityEngine|UnityEditor|System|Mono)\./;

/** 예외 이름(메시지의 `:` 앞) + 엔진 프레임을 뺀 맨 위 셋(네임스페이스 뺀 클래스.메서드) */
export function 게임예외지문(메시지: string, 스택: string): 지문 {
  // `:` 가 없는 메시지는 통째로 이름이 되므로 값을 틀로 접는다
  const 이름 = 메시지틀(메시지.split(':', 1)[0]!.trim());
  const 프레임 = 프레임셋(스택.split('\n'), (x) => !엔진프레임.test(x)).map(끝두칸);
  return {
    source: 'GAME_EXCEPTION',
    fingerprint: 해시(이름, ...프레임.map(번호접기)),
    title: 프레임.length === 0 ? 이름 : `${이름} · ${프레임[0]}`,
    message: 메시지틀(메시지),
  };
}

/** 오류 시각이 단계 시작 시각 이상인 마지막 단계. 둘 중 하나라도 없으면 null — 시계가 어긋나도 단계 하나 안팎이라 받아들인다 */
export function 게임단계(occurredAt: string | null, 단계들: readonly { seq: number; startedAt: string | null }[]): number | null {
  if (occurredAt === null) return null;
  const 때 = Date.parse(occurredAt);
  if (Number.isNaN(때)) return null;
  let 맞는: number | null = null;
  for (const s of 단계들) {
    if (s.startedAt === null) continue;
    const 시작 = Date.parse(s.startedAt);
    if (시작 <= 때 && (맞는 === null || s.seq > 맞는)) 맞는 = s.seq;
  }
  return 맞는;
}
