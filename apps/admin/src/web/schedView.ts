// 정기 실행 달력이 그릴 칸 — 지난 회차는 서버 것을, 앞으로의 예정은 세트줄의 반복 · 시각 · 평균 시간으로 여기서 그린다 (도메인/정기실행 §7 calendar · §8.20)

import type { 세트, 회차 } from './schedApi.js';

/** 'YYYY-MM-DD' 에 하루씩 더한다. 브라우저 시간대를 타지 않게 UTC 로만 센다 */
export function 날더하기(날: string, n: number): string {
  const d = new Date(`${날}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const 날차 = (앞: string, 뒤: string) => Math.round((Date.parse(`${뒤}T00:00:00Z`) - Date.parse(`${앞}T00:00:00Z`)) / 86_400_000);
/** 0(일) ~ 6(토) — 세트줄 days 와 같은 셈 */
export const 요일 = (날: string) => new Date(`${날}T00:00:00Z`).getUTCDay();
export const 분 = (at: string) => {
  const [시, 분값] = at.split(':').map(Number);
  return (시 ?? 0) * 60 + (분값 ?? 0);
};
export const 시각글 = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

// 시간대마다 하나 — 달력 한 장에 칸마다 부르므로 만들어 둔 것을 다시 쓴다
const 시간대틀 = new Map<string, Intl.DateTimeFormat>();

/** 그 시간대의 날짜와 하루 안의 분. 세트 시각이 세트 시간대 기준이라(§3.16 결정 6) 칸도 그 시간대로 가른다 */
export function 시간대로(시각: Date, tz: string): { 날: string; 분: number } {
  let 틀 = 시간대틀.get(tz);
  if (틀 === undefined) {
    틀 = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    시간대틀.set(tz, 틀);
  }
  const 조각 = Object.fromEntries(
    틀
      .formatToParts(시각)
      .map((p) => [p.type, p.value]),
  );
  return { 날: `${조각.year}-${조각.month}-${조각.day}`, 분: Number(조각.hour) * 60 + Number(조각.minute) };
}

export const 도는날인가 = (세트: Pick<세트, 'days' | 'onceOn'>, 날: string) => (세트.onceOn !== null ? 세트.onceOn === 날 : (세트.days ?? []).includes(요일(날)));

type 반복꼴 = Pick<세트, 'isOn' | 'tz' | 'at' | 'days' | 'onceOn'>;

/** 앞으로 돌 날 수개. 꺼졌거나 「한 번만」이 지났으면 빈 목록. 오늘 시각이 이미 지났으면 다음 날부터다 (§3.16 「저장한 그날」) */
export function 다음날들(세트: 반복꼴, 지금: Date, 수: number): string[] {
  if (!세트.isOn) return [];
  const 오늘 = 시간대로(지금, 세트.tz);
  const 날들: string[] = [];
  for (let i = 0; i < 371 && 날들.length < 수; i++) {
    const 날 = 날더하기(오늘.날, i);
    if (도는날인가(세트, 날) && !(i === 0 && 분(세트.at) <= 오늘.분)) 날들.push(날);
  }
  return 날들;
}
export const 다음날 = (세트: 반복꼴, 지금: Date): string | null => 다음날들(세트, 지금, 1)[0] ?? null;

export type 칩상태 = 'pass' | 'fail' | 'none' | 'running' | 'plan';

/** 달력의 칸 하나 — 세트가 그날 한 번 도는 것. 분은 그날 0시부터(자정을 넘기면 1440 을 넘는다) */
export interface 칩 {
  세트: 세트;
  날: string;
  정한분: number;
  시작분: number;
  끝분: number;
  /** 앞 세트를 기다린 분. 예정이면 예상이다 (§3.16 결정 8) */
  대기분: number;
  상태: 칩상태;
  /** 서버에 있는 회차. 앞으로의 예정이면 null */
  회차: 회차 | null;
  실패: number;
  의심: number;
}

function 회차칩(o: 회차, 세트: 세트): 칩 {
  const 정한분 = 시간대로(new Date(o.plannedAt), 세트.tz).분;
  // 앞 세트를 기다리다 자정을 넘겨 시작할 수 있다 — 회차 날(plannedOn) 0시부터 센다
  const 그날분 = (iso: string) => {
    const x = 시간대로(new Date(iso), 세트.tz);
    return x.분 + 1440 * 날차(o.plannedOn, x.날);
  };
  const 시작분 = o.startedAt === null ? 정한분 : 그날분(o.startedAt);
  const 상태: 칩상태 = o.state === 'QUEUED' ? 'plan' : o.state === 'RUNNING' ? 'running' : o.verdict === 'PASS' ? 'pass' : o.verdict === 'FAIL' ? 'fail' : 'none';
  return {
    세트,
    날: o.plannedOn,
    정한분,
    시작분,
    끝분: o.finishedAt === null ? 시작분 + (세트.avgMinutes ?? 0) : 그날분(o.finishedAt),
    대기분: o.startedAt === null ? 0 : Math.max(0, Math.round((Date.parse(o.startedAt) - Date.parse(o.plannedAt)) / 60_000)),
    상태,
    회차: o,
    실패: o.runs.filter((r) => r.kind !== 'COMPAT').reduce((n, r) => n + r.failed, 0),
    의심: o.suspects,
  };
}

/**
 * from ~ to 의 날마다 칸들(시작 차례). 끈 세트 · 건너뛴 회차는 그리지 않는다.
 * 프로젝트 안 세트는 한 번에 하나라(§3.16 결정 8) 아직 시작 안 한 칸은 앞 칸이 끝날 때(평균 시간)까지 밀어 예상 시작을 단다
 */
export function 칩들(세트들: readonly 세트[], 회차들: readonly 회차[], from: string, to: string, 지금: Date): Map<string, 칩[]> {
  const 표 = new Map<string, 칩[]>();
  const 넣기 = (c: 칩) => 표.set(c.날, [...(표.get(c.날) ?? []), c]);
  const 세트표 = new Map(세트들.map((s) => [s.id, s]));
  const 있음 = new Set<string>();
  for (const o of 회차들) {
    const 세트 = 세트표.get(o.setId);
    있음.add(`${String(o.setId)}|${o.plannedOn}`);
    if (세트 === undefined || o.state === 'SKIPPED') continue;
    넣기(회차칩(o, 세트));
  }
  for (const 세트 of 세트들) {
    if (!세트.isOn) continue;
    const 오늘 = 시간대로(지금, 세트.tz);
    for (let 날 = 오늘.날 > from ? 오늘.날 : from; 날 <= to; 날 = 날더하기(날, 1)) {
      if (!도는날인가(세트, 날) || 있음.has(`${String(세트.id)}|${날}`)) continue;
      if (날 === 오늘.날 && 분(세트.at) <= 오늘.분) continue;
      const 정한분 = 분(세트.at);
      넣기({ 세트, 날, 정한분, 시작분: 정한분, 끝분: 정한분, 대기분: 0, 상태: 'plan', 회차: null, 실패: 0, 의심: 0 });
    }
  }
  for (const [날, 줄] of 표) {
    줄.sort((a, b) => a.정한분 - b.정한분 || a.세트.id - b.세트.id);
    // ponytail: 세트마다 시간대가 달라도 하루 안 분으로 줄 세운다 — 한 프로젝트가 여러 시간대를 섞으면 대기 예상이 어긋난다
    let 앞끝 = 0;
    for (const c of 줄) {
      // 이 칸의 날 0시부터 센 지금 — 어제부터 줄 선 회차면 1440 을 넘는다
      const 오늘 = 시간대로(지금, c.세트.tz);
      const 지금분 = 오늘.분 + 1440 * 날차(날, 오늘.날);
      if (c.상태 === 'plan') {
        // 줄에 서서 기다리는 회차는 지금보다 앞서 시작할 수 없다
        c.시작분 = Math.max(c.정한분, 앞끝, c.회차 !== null ? 지금분 : 0);
        c.대기분 = c.시작분 - c.정한분;
        c.끝분 = c.시작분 + (c.세트.avgMinutes ?? 0);
      } else if (c.상태 === 'running') {
        // 평균보다 오래 도는 중이면 적어도 지금까지는 돈다 — 뒤 칸이 그보다 앞서 시작한다고 그리지 않게
        c.끝분 = Math.max(c.끝분, 지금분);
      }
      앞끝 = Math.max(앞끝, c.끝분);
    }
    줄.sort((a, b) => a.시작분 - b.시작분 || a.세트.id - b.세트.id);
  }
  return 표;
}

/** 월요일부터 그 달을 덮는 주들의 날 (§8.20 「한 주는 월요일부터다」) */
export const 주시작 = (날: string) => 날더하기(날, -((요일(날) + 6) % 7));
export function 월칸들(달: string): string[] {
  const 첫날 = `${달.slice(0, 7)}-01`;
  const 끝날 = 날더하기(`${날더하기(첫날, 32).slice(0, 7)}-01`, -1);
  const 칸: string[] = [];
  for (let 날 = 주시작(첫날); 칸.length % 7 !== 0 || 날 <= 끝날; 날 = 날더하기(날, 1)) 칸.push(날);
  return 칸;
}

/** 주 · 일 보기에서 펼칠 시간 — 칸이 있는 시간대만 (§8.20 「세트가 있는 시간대만 펼친다」). 칸이 없으면 null */
export function 시간범위(칸들: readonly 칩[]): [number, number] | null {
  if (칸들.length === 0) return null;
  const 처음 = Math.min(...칸들.map((c) => Math.min(c.정한분, c.시작분)));
  const 끝 = Math.max(...칸들.map((c) => Math.max(c.끝분, c.시작분 + 30)));
  return [Math.floor(처음 / 60), Math.ceil(끝 / 60)];
}

/** 주 · 일 보기에서 시간이 걸치는 막대를 옆으로 나눈다 — 안 나누면 늦은 막대가 앞 막대를 덮어 세트 하나가 사라진다.
 *  막대는 최소 높이가 있어 `최소분` 보다 짧아도 그만큼 자리를 차지한다. 들어온 차례대로 [몇째 줄, 줄 수] 를 돌려준다 */
export function 나란히(칸들: readonly Pick<칩, '시작분' | '끝분'>[], 최소분: number): { 줄: number; 줄수: number }[] {
  const 끝 = (c: Pick<칩, '시작분' | '끝분'>) => Math.max(c.끝분, c.시작분 + 최소분);
  const 차례 = 칸들.map((_, i) => i).sort((a, b) => 칸들[a]!.시작분 - 칸들[b]!.시작분);
  const 답 = 칸들.map(() => ({ 줄: 0, 줄수: 1 }));
  let 묶음: number[] = [];
  let 줄끝: number[] = [];
  const 닫기 = () => {
    for (const i of 묶음) 답[i]!.줄수 = 줄끝.length;
    묶음 = [];
    줄끝 = [];
  };
  for (const i of 차례) {
    const c = 칸들[i]!;
    if (줄끝.length > 0 && 줄끝.every((e) => e <= c.시작분)) 닫기();
    const 빈줄 = 줄끝.findIndex((e) => e <= c.시작분);
    const 줄 = 빈줄 === -1 ? 줄끝.length : 빈줄;
    줄끝[줄] = 끝(c);
    답[i]!.줄 = 줄;
    묶음.push(i);
  }
  닫기();
  return 답;
}

/** 실행 결과로 가는 주소 — 호환성은 따로 선다 (route.ts) */
export const 실행주소 = (kind: string, runId: number) => (kind === 'COMPAT' ? `#/compat/runs/${String(runId)}` : `#/runs/${String(runId)}`);
