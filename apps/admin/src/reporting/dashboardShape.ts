// 앱 대시보드 숫자(통과율 · 일별 · 서비스별 · 신규 실패 · 히트맵)를 접은 줄에서 만드는 순수 함수

import { 판정표, type 변화 as 판정변화 } from './insights.js';

export const 창날수 = 14;
/** 커버리지 추이를 보는 날 수. 질의(할 일 4)가 쓰고 여기서는 값만 둔다 */
export const 커버리지날수 = 30;
export const 신규실패상한 = 10;
export const 히트맵케이스수 = 8;

export type 접힌판정 = 'PASS' | 'FAIL' | 'NA';

// 같은 (실행, 케이스, 디바이스)의 회차를 접은 한 줄이다. 접는 규칙은 insights.ts 의 접기 SQL 과 같다.
// day 는 SQL 이 AT TIME ZONE 으로 이미 자른 글자라 여기서는 시간대를 다루지 않는다
export interface 접은줄 {
  runId: number;
  serviceId: number;
  serviceName: string;
  env: string;
  kind: 'UI' | 'FN';
  day: string;
  /** 어느 실행이 최신인지는 insights 와 같이 시작 시각으로 가른다 — 끝 시각은 실행이 겹치면 순서가 뒤집힌다 */
  startedAt: string;
  finishedAt: string;
  tcId: string;
  tcName: string;
  platform: 'desktop' | 'mobile';
  verdict: 접힌판정;
  unconfirmed: boolean;
  /** 실패 줄의 대표 문장(insights 와 같은 말). 실제 값(actual · expected)은 싣지 않는다 — 비밀값이 샐 수 있다 */
  reason: string | null;
}

// 이번 실행 번호를 키로 묶어 넘기므로 runId 를 안 싣는다. 키가 곧 「누구의 앞 실행인가」다.
// 앞 실행은 같은 서비스 · env · kind 의 바로 앞 끝난 실행이고, 고르는 일은 질의가 한다
export interface 앞판정 {
  tcId: string;
  platform: 'desktop' | 'mobile';
  verdict: 접힌판정;
  unconfirmed: boolean;
}

export interface 셈 {
  통과: number;
  실패: number;
  미실행: number;
}

export interface 일별칸 extends 셈 {
  day: string;
}

export const 흐름실행수 = 20;

export interface 서비스칸 {
  serviceId: number;
  serviceName: string;
  이번: 셈;
  직전: 셈;
  마지막실행: (셈 & { runId: number; finishedAt: string }) | null;
  /** 창 안 실행을 오래된 것부터 최근 `흐름실행수`개. F 실패 있음 · P 전부 통과 · N 그 밖(미확정 항목은 빼고 본다) */
  흐름: ('F' | 'P' | 'N')[];
  신규실패수: number;
  /** insights 「고쳐짐」 — 앞 FAIL → 이번 PASS 이고 그 뒤 다시 실패하지 않은 (케이스, 디바이스) 수 */
  해결수: number;
  /** 이번 창 실행 중 하나라도 앞 실행과 견줬나. 앞 실행은 창 밖에 있을 수 있어 흐름 길이로는 못 가른다 — 화면의 「견줄 앞 실행이 없습니다」 */
  견줌: boolean;
}

export interface 신규실패칸 {
  runId: number;
  serviceId: number;
  serviceName: string;
  env: string;
  kind: 'UI' | 'FN';
  tcId: string;
  tcName: string;
  platform: 'desktop' | 'mobile';
  finishedAt: string;
  reason: string | null;
}

export interface 히트맵줄 {
  tcId: string;
  tcName: string;
  실패수: number;
  /** 오래된 날부터 오늘까지 14칸. 0 · 1 · 2 (2 이상은 2) */
  칸: (0 | 1 | 2)[];
}

export interface 집계 {
  이번: 셈;
  직전: 셈;
  /** 이번 창의 미확정 줄 수. 통과율에는 안 들어가고 「미확정 N건은 따로 셉니다」에 쓴다 */
  미확정건수: number;
  일별: 일별칸[];
  서비스별: 서비스칸[];
  신규실패: 신규실패칸[];
  히트맵: 히트맵줄[];
}

// 날짜를 더하는 곳은 여기 하나다. UTC 로 계산하면 서머타임이 날짜를 건너뛰게 만들지 못한다
export function 날짜더하기(day: string, 일수: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 일수)).toISOString().slice(0, 10);
}

const 빈셈 = (): 셈 => ({ 통과: 0, 실패: 0, 미실행: 0 });
const 새항목 = (id: number, name: string): { 칸: 서비스칸; 마지막: Map<number, 셈> } => ({
  칸: { serviceId: id, serviceName: name, 이번: 빈셈(), 직전: 빈셈(), 마지막실행: null, 흐름: [], 신규실패수: 0, 해결수: 0, 견줌: false },
  마지막: new Map(),
});

function 더한다(셈값: 셈, verdict: 접힌판정): void {
  if (verdict === 'PASS') 셈값.통과 += 1;
  else if (verdict === 'FAIL') 셈값.실패 += 1;
  else 셈값.미실행 += 1;
}

export function 대시보드집계(줄들: 접은줄[], 앞판정들: Map<number, 앞판정[]>, 오늘: string, 서비스들: { id: number; name: string }[] = []): 집계 {
  const 이번시작 = 날짜더하기(오늘, -(창날수 - 1));
  const 직전시작 = 날짜더하기(오늘, -(창날수 * 2 - 1));
  // 'YYYY-MM-DD' 는 글자 순서가 곧 날짜 순서다
  const 이번창 = (day: string): boolean => day >= 이번시작 && day <= 오늘;
  const 직전창 = (day: string): boolean => day >= 직전시작 && day < 이번시작;

  const 이번 = 빈셈();
  const 직전 = 빈셈();
  let 미확정건수 = 0;
  const 일별 = new Map<string, 일별칸>();
  for (let i = 0; i < 창날수; i += 1) {
    const day = 날짜더하기(이번시작, i);
    일별.set(day, { day, ...빈셈() });
  }
  const 서비스 = new Map<number, { 칸: 서비스칸; 마지막: Map<number, 셈> }>();
  const 마지막끝 = new Map<number, { runId: number; startedAt: string; finishedAt: string }>();
  const 앞맵 = 앞판정맵(앞판정들);

  for (const 줄 of 줄들) {
    const 이번인가 = 이번창(줄.day);
    if (!이번인가 && !직전창(줄.day)) continue;
    if (이번인가 && 줄.unconfirmed) 미확정건수 += 1;
    if (줄.unconfirmed) continue;

    더한다(이번인가 ? 이번 : 직전, 줄.verdict);
    const 하루 = 일별.get(줄.day);
    if (하루 !== undefined) 더한다(하루, 줄.verdict);

    const 서비스항목 = 서비스.get(줄.serviceId) ?? 새항목(줄.serviceId, 줄.serviceName);
    서비스.set(줄.serviceId, 서비스항목);
    if (이번인가 && 앞판정들.has(줄.runId)) 서비스항목.칸.견줌 = true;
    더한다(이번인가 ? 서비스항목.칸.이번 : 서비스항목.칸.직전, 줄.verdict);

    const 실행셈 = 서비스항목.마지막.get(줄.runId) ?? 빈셈();
    서비스항목.마지막.set(줄.runId, 실행셈);
    더한다(실행셈, 줄.verdict);
    const 끝 = 마지막끝.get(줄.serviceId);
    if (끝 === undefined || 오래된순(끝, 줄) < 0) {
      마지막끝.set(줄.serviceId, { runId: 줄.runId, startedAt: 줄.startedAt, finishedAt: 줄.finishedAt });
    }
  }

  // 줄이 없는 서비스도 한 줄은 낸다 — 화면의 「마지막 실행이 없습니다」 갈래가 이 칸으로 탄다
  for (const { id, name } of 서비스들) if (!서비스.has(id)) 서비스.set(id, 새항목(id, name));

  const 최근 = 최근판정(줄들);
  const 신규전부 = 신규실패를뽑는다(줄들, 앞맵, 이번창, 최근);
  const 해결 = 해결을센다(줄들, 앞맵, 이번창, 최근);
  const 흐름 = 흐름을만든다(줄들, 이번창);

  const 서비스별 = [...서비스.values()]
    .map(({ 칸, 마지막 }) => {
      const 끝 = 마지막끝.get(칸.serviceId);
      const 셈값 = 끝 === undefined ? undefined : 마지막.get(끝.runId);
      return {
        ...칸,
        마지막실행: 끝 === undefined || 셈값 === undefined ? null : { runId: 끝.runId, finishedAt: 끝.finishedAt, ...셈값 },
        흐름: 흐름.get(칸.serviceId) ?? [],
        신규실패수: 신규전부.filter((n) => n.serviceId === 칸.serviceId).length,
        해결수: 해결.get(칸.serviceId) ?? 0,
      };
    })
    .sort((a, b) => a.serviceId - b.serviceId);

  return {
    이번,
    직전,
    미확정건수,
    일별: [...일별.values()],
    서비스별,
    신규실패: 신규전부.slice(0, 신규실패상한),
    히트맵: 히트맵을만든다(줄들, 이번시작, 이번창),
  };
}

const 케이스키 = (줄: 접은줄): string => `${줄.serviceId}\u0000${줄.tcId}\u0000${줄.platform}`;
const 오래된순 = <T extends { startedAt: string; runId: number }>(a: T, b: T): number =>
  a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : a.runId - b.runId;

// 줄마다 앞 판정을 선형으로 찾지 않게 (실행, 케이스, 디바이스) 키 Map 을 한 번 만든다
const 앞키 = (runId: number, tcId: string, platform: string): string => `${runId}\u0000${tcId}\u0000${platform}`;
type 앞맵형 = Map<string, 앞판정>;
const 앞판정맵 = (앞판정들: Map<number, 앞판정[]>): 앞맵형 =>
  new Map([...앞판정들].flatMap(([runId, 목록]) => 목록.map((a): [string, 앞판정] => [앞키(runId, a.tcId, a.platform), a])));

// (서비스, 케이스, 디바이스)마다 가장 최근 확정 판정. 신규 실패 · 해결을 「지금도 그런가」로 거르는 데 쓴다.
// 미확정 줄은 판정이 아니라서 뺀다
function 최근판정(줄들: 접은줄[]): Map<string, 접힌판정> {
  const 결과 = new Map<string, 접힌판정>();
  for (const 줄 of [...줄들].filter((l) => !l.unconfirmed).sort(오래된순)) 결과.set(케이스키(줄), 줄.verdict);
  return 결과;
}

// 실행마다 한 글자로 접는다. 미확정은 빼고 보므로 미확정뿐인 실행은 N 이다
function 흐름을만든다(줄들: 접은줄[], 이번창: (day: string) => boolean): Map<number, ('F' | 'P' | 'N')[]> {
  const 실행들 = new Map<number, { 줄: 접은줄; 판정: 접힌판정[] }>();
  for (const 줄 of 줄들) {
    if (!이번창(줄.day)) continue;
    const 실행 = 실행들.get(줄.runId) ?? { 줄, 판정: [] };
    실행들.set(줄.runId, 실행);
    if (!줄.unconfirmed) 실행.판정.push(줄.verdict);
  }
  const 서비스별 = new Map<number, ('F' | 'P' | 'N')[]>();
  for (const { 줄, 판정 } of [...실행들.values()].sort((a, b) => 오래된순(a.줄, b.줄))) {
    const 글자 = 판정.includes('FAIL') ? 'F' : 판정.length > 0 && 판정.every((v) => v === 'PASS') ? 'P' : 'N';
    서비스별.set(줄.serviceId, [...(서비스별.get(줄.serviceId) ?? []), 글자]);
  }
  for (const [id, 글자들] of 서비스별) 서비스별.set(id, 글자들.slice(-흐름실행수));
  return 서비스별;
}

// 앞 실행과 견줘 줄 하나의 변화를 본다. 앞에 없던 케이스와 어느 한쪽이 미확정인 케이스는 견주지 않는다
// (insights.ts compareWithPrevious 와 같은 규칙)
function 줄변화(줄: 접은줄, 앞맵: 앞맵형): 판정변화 | null {
  if (줄.unconfirmed) return null;
  const 앞 = 앞맵.get(앞키(줄.runId, 줄.tcId, 줄.platform));
  return 앞 === undefined || 앞.unconfirmed ? null : 판정표[앞.verdict][줄.verdict];
}

function 해결을센다(
  줄들: 접은줄[],
  앞맵: 앞맵형,
  이번창: (day: string) => boolean,
  최근: Map<string, 접힌판정>,
): Map<number, number> {
  const 키들 = new Map<number, Set<string>>();
  for (const 줄 of 줄들) {
    if (!이번창(줄.day) || 최근.get(케이스키(줄)) !== 'PASS' || 줄변화(줄, 앞맵) !== '고쳐짐') continue;
    키들.set(줄.serviceId, (키들.get(줄.serviceId) ?? new Set<string>()).add(케이스키(줄)));
  }
  return new Map([...키들].map(([id, 키]) => [id, 키.size]));
}

// 「새로깨짐」인 것 가운데 지금도 실패인 것만 낸다 — 뒤 실행에서 다시 통과했거나 못 돌았으면 뺀다.
// 같은 (서비스, 케이스, 디바이스)는 가장 최근 새로 깨진 하나다. 상한은 부르는 쪽이 자른다(서비스별 건수는 전부를 센다)
function 신규실패를뽑는다(
  줄들: 접은줄[],
  앞맵: 앞맵형,
  이번창: (day: string) => boolean,
  최근: Map<string, 접힌판정>,
): 신규실패칸[] {
  const 후보 = 줄들
    .filter((줄) => 줄.verdict === 'FAIL' && 이번창(줄.day) && 줄변화(줄, 앞맵) === '새로깨짐')
    .filter((줄) => 최근.get(케이스키(줄)) === 'FAIL')
    .sort((a, b) => 오래된순(b, a));

  const 본것 = new Set<string>();
  const 결과: 신규실패칸[] = [];
  for (const 줄 of 후보) {
    if (본것.has(케이스키(줄))) continue;
    본것.add(케이스키(줄));
    const { runId, serviceId, serviceName, env, kind, tcId, tcName, platform, finishedAt, reason } = 줄;
    결과.push({ runId, serviceId, serviceName, env, kind, tcId, tcName, platform, finishedAt, reason });
  }
  return 결과;
}

function 히트맵을만든다(줄들: 접은줄[], 이번시작: string, 이번창: (day: string) => boolean): 히트맵줄[] {
  const 날들 = Array.from({ length: 창날수 }, (_, i) => 날짜더하기(이번시작, i));
  const 케이스 = new Map<string, { tcName: string; 최근: string; 날별: number[]; 실패수: number }>();
  for (const 줄 of 줄들) {
    if (줄.verdict !== 'FAIL' || 줄.unconfirmed || !이번창(줄.day)) continue;
    const 항목 = 케이스.get(줄.tcId) ?? {
      tcName: 줄.tcName,
      최근: 줄.finishedAt,
      날별: new Array<number>(창날수).fill(0),
      실패수: 0,
    };
    케이스.set(줄.tcId, 항목);
    if (줄.finishedAt >= 항목.최근) {
      항목.최근 = 줄.finishedAt;
      항목.tcName = 줄.tcName;
    }
    const 자리 = 날들.indexOf(줄.day);
    항목.날별[자리] = (항목.날별[자리] ?? 0) + 1;
    항목.실패수 += 1;
  }
  return [...케이스.entries()]
    .sort(([a, x], [b, y]) => y.실패수 - x.실패수 || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, 히트맵케이스수)
    .map(([tcId, 항목]) => ({
      tcId,
      tcName: 항목.tcName,
      실패수: 항목.실패수,
      칸: 항목.날별.map((n) => (n >= 2 ? 2 : n === 1 ? 1 : 0)),
    }));
}
