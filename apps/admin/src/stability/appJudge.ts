// 앱 항목 logcat 에서 그 애플리케이션의 크래시(FATAL EXCEPTION) · ANR 만 골라 지문을 매긴다 (도메인/안정화 §3.15 「무엇을 세나」 · 「지문」)

import { 앱ANR지문, 앱크래시지문, type 지문 } from './fingerprint.js';

export interface 앱오류 {
  지문: 지문;
  /** 그 덩어리 원문 줄 — 넣기 전에 항목 비밀값을 가린다 */
  견본: string;
  hits: number;
}

// threadtime 꼴 `11-12 10:00:03.123  4321  4321 E AndroidRuntime: FATAL EXCEPTION: main` — 날짜 · 시각 · pid · tid · 수준 · 태그 · 글
const 줄꼴 = /^\d\d-\d\d \d\d:\d\d:\d\d\.\d+\s+(\d+)\s+(\d+)\s+[VDIWEFA]\s+([^:]*?)\s*: ?(.*)$/;
const 프로세스줄 = /^Process: ([^,\s]+), PID:/;
// `ANR in com.x (com.x/.MainActivity)` — 괄호 안 화면은 없을 수 있다
const ANR줄 = /^ANR in (\S+)(?: \(([^)]+)\))?/;
// ANR 덩어리는 같은 스레드 줄 이만큼에서 Reason 을 찾는다 — 뒤로 CPU 사용량 줄이 수십 줄 붙는다
const ANR덩어리 = 20;
// ponytail: 같은 스레드 줄을 찾느라 훑는 원래 줄 상한 — 남의 줄이 이보다 많이 끼면 Reason 을 놓친다
const ANR훑기 = 500;

interface 줄 { pid: string; tid: string; 태그: string; 글: string; 원문: string }

const 쪼갠다 = (글: string): 줄[] =>
  글.split('\n').flatMap((원문) => {
    const m = 줄꼴.exec(원문.trimEnd());
    return m === null ? [] : [{ pid: m[1]!, tid: m[2]!, 태그: m[3]!, 글: m[4]!, 원문: 원문.trimEnd() }];
  });

// 프로세스 이름은 `패키지` 나 `패키지:하위` 다 — 하위 프로세스 크래시도 그 앱 것이다
const 패키지만 = (프로세스: string): string => 프로세스.split(':')[0]!;

/**
 * 패키지들 중 하나로 시작한 프로세스의 크래시 · ANR 만. 앱 PID 를 몰라도 패키지 이름으로 가른다 —
 * 앱이 이미 떠 있어 `Start proc` 줄이 없는 항목에서 남의 크래시를 세지 않게. 같은 지문은 한 줄로 모아 횟수를 더한다
 */
export function 앱항목오류(logcat: string, 패키지들: ReadonlySet<string>): 앱오류[] {
  if (패키지들.size === 0) return [];
  const 줄들 = 쪼갠다(logcat);
  const 모음 = new Map<string, 앱오류>();
  const 더한다 = (지문: 지문, 견본: string): void => {
    const 있던 = 모음.get(지문.fingerprint);
    if (있던 === undefined) 모음.set(지문.fingerprint, { 지문, 견본, hits: 1 });
    else 있던.hits += 1;
  };

  // FATAL EXCEPTION 덩어리 — 같은 pid 의 AndroidRuntime 줄을 다음 FATAL 까지 모은다(다른 프로세스 줄이 사이에 끼어도 된다)
  const 덩어리들: 줄[][] = [];
  const 열린 = new Map<string, 줄[]>();
  for (const l of 줄들) {
    if (l.태그 !== 'AndroidRuntime') continue;
    if (l.글.startsWith('FATAL EXCEPTION')) {
      const 새것 = [l];
      덩어리들.push(새것);
      열린.set(l.pid, 새것);
    } else {
      열린.get(l.pid)?.push(l);
    }
  }
  for (const 덩어리 of 덩어리들) {
    const 프로세스 = 덩어리.map((l) => 프로세스줄.exec(l.글)?.[1]).find((p) => p !== undefined);
    if (프로세스 === undefined || !패키지들.has(패키지만(프로세스))) continue;
    const 몸 = 덩어리.slice(덩어리.findIndex((l) => 프로세스줄.test(l.글)) + 1).map((l) => l.글);
    const 예외줄 = 몸.find((g) => g.trim() !== '' && !g.trim().startsWith('at '));
    if (예외줄 === undefined) continue;
    const 프레임 = 몸.filter((g) => g.trim().startsWith('at '));
    더한다(앱크래시지문(패키지만(프로세스), 예외줄, 프레임), 덩어리.map((l) => l.원문).join('\n'));
  }

  // ANR — 시스템(ActivityManager)이 앱을 두고 남긴다. 같은 tid 의 뒤 줄에서 Reason 을 찾는다
  줄들.forEach((l, i) => {
    if (l.태그 !== 'ActivityManager') return;
    const m = ANR줄.exec(l.글);
    if (m === null || !패키지들.has(패키지만(m[1]!))) return;
    // 남의 줄이 끼어도 Reason 을 놓치지 않게 같은 스레드 줄을 먼저 고른 뒤 센다 — 놓치면 같은 ANR 이 날마다 다른 지문이 된다
    const 뒤 = 줄들.slice(i, i + ANR훑기).filter((x) => x.tid === l.tid && x.태그 === l.태그).slice(0, ANR덩어리);
    const 끝 = 뒤.findIndex((x, k) => k > 0 && ANR줄.test(x.글));
    const 덩어리 = 끝 === -1 ? 뒤 : 뒤.slice(0, 끝);
    const 까닭 = 덩어리.map((x) => /^Reason: (.*)$/.exec(x.글)?.[1]).find((r) => r !== undefined) ?? '';
    // 괄호 안 화면 `com.x/.MainActivity` 의 `/` 뒤 — 없으면 null
    const 화면 = m[2]?.split('/')[1] ?? null;
    더한다(앱ANR지문(패키지만(m[1]!), 화면, 까닭), 덩어리.map((x) => x.원문).join('\n'));
  });
  return [...모음.values()];
}
