// 기기 성능 화면의 계산 — 지표 이름 · 값 글자 · 목표 미달 · 실행 중 요약 · 녹화 조각 고르기 (도메인/성능 §3.9 「기기 성능」 · §8.14)

import type { 실행상세 } from './perfApi.js';
import type { 기기결과, 기기목표, 기기설정, 기기숫자, 기기요약, 기기지표, 조작, 측정지표 } from './perfDeviceApi.js';
import { 가장큰값, type 말 } from './perfRunView.js';

/** 지표 차례 · 이름 · 부등호. 부등호는 지표에 매여 있다 — 서버가 거꾸로 온 요청을 거절한다 (§7 「기기 성능 목표 한 줄」) */
export const 지표표: Record<기기지표, { 이름: string; op: '<=' | '>=' }> = {
  AVG_FPS: { 이름: '평균 FPS', op: '>=' },
  LOW1_FPS: { 이름: '1% Low FPS', op: '>=' },
  MAX_TEMP: { 이름: '최대 기기 온도', op: '<=' },
  MAX_MEM: { 이름: '메모리 최대', op: '<=' },
  LAUNCH_MS: { 이름: '앱 실행 시간', op: '<=' },
};
export const 지표차례 = Object.keys(지표표) as 기기지표[];

/** 측정 항목 칩 — 화면이 그릴 그래프만 가른다. 기록기는 늘 다 읽는다 */
export const 측정항목: [측정지표, string][] = [
  ['FPS', 'FPS'],
  ['JANK', '프레임 드랍'],
  ['CPU', 'CPU'],
  ['MEM', '메모리'],
  ['TEMP', '기기 온도'],
  ['BATTERY', '배터리'],
];

/** 케이스로 재는 조작 방식은 애플리케이션 종류가 정한다 — 게임 화면은 Appium 이 버튼을 못 찾는다 (§3.9 「조작 셋」) */
export const 케이스조작 = (kind: string | undefined): 조작 => (kind === 'GAME' ? 'GAME' : 'APPIUM');

/** 머리 부제의 조작 방식 글자 — 실행 중 · 결과가 같이 쓴다 */
export const 조작글 = (설정: 기기설정, t: 말): string =>
  설정.drive === 'MANUAL'
    ? t('직접 플레이')
    : 설정.drive === 'GAME'
      ? t('게임 케이스 {수}개', { 수: 설정.caseIds.length })
      : t('Appium 케이스 {수}개', { 수: 설정.caseIds.length });

/** 처음 여는 측정의 목표 — 시안의 값이다. 사람이 고치거나 지운다 */
export const 기본목표: 기기목표[] = [
  { metric: 'AVG_FPS', op: '>=', value: 45, source: 'MANUAL' },
  { metric: 'LOW1_FPS', op: '>=', value: 30, source: 'MANUAL' },
  { metric: 'MAX_TEMP', op: '<=', value: 45, source: 'MANUAL' },
  { metric: 'MAX_MEM', op: '<=', value: 1536, source: 'MANUAL' },
  { metric: 'LAUNCH_MS', op: '<=', value: 3000, source: 'MANUAL' },
];

const 한자리 = (n: number): number => Math.round(n * 10) / 10;

export const 메모리글자 = (mb: number | null): string => (mb === null ? '-' : mb >= 1024 ? `${(mb / 1024).toFixed(2)}GB` : `${String(Math.round(mb))}MB`);

/** 지표 값을 그 단위로. 앱 실행 시간은 ms 로 와서 초로 보인다 */
export function 값글자(metric: 기기지표, 값: number | null, t: 말): string {
  if (값 === null) return '-';
  if (metric === 'MAX_TEMP') return t('{수}도', { 수: 한자리(값) });
  if (metric === 'MAX_MEM') return 메모리글자(값);
  if (metric === 'LAUNCH_MS') return t('{수}초', { 수: 한자리(값 / 1000) });
  return String(한자리(값));
}

/** 목표를 벗어났나 — 값이 없으면 아직 모르는 것이라 벗어나지 않은 것으로 본다(판정은 서버가 끝에 한다) */
export const 벗어남 = (목표: Pick<기기목표, 'op' | 'value'>, 값: number | null): boolean =>
  값 !== null && (목표.op === '>=' ? 값 < 목표.value : 값 > 목표.value);

const 값들 = (xs: (number | null)[]): number[] => xs.filter((x): x is number => x !== null);
const 평균 = (v: number[]): number | null => (v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length);

/** 실행 중 지금까지 받은 숫자의 요약 — 서버 deviceStats 의 기기요약하기와 같은 셈이다(서버 쪽은 zod 를 끌고 와 화면이 따로 센다) */
export function 지금요약(줄들: readonly 기기숫자[]): 기기요약 {
  const fps = 값들(줄들.map((r) => r.fps)).sort((a, b) => a - b);
  const 낮은 = fps.slice(0, Math.max(1, Math.floor(fps.length * 0.01)));
  const 최대 = (v: number[]) => (v.length === 0 ? null : 가장큰값(v, -Infinity));
  const 반올림 = (v: number | null) => (v === null ? null : 한자리(v));
  return {
    avgFps: 반올림(평균(fps)),
    low1Fps: fps.length === 0 ? null : 반올림(평균(낮은)),
    maxTempC: 최대(값들(줄들.map((r) => r.tempC))),
    maxMemMb: 최대(값들(줄들.map((r) => r.memMb))),
    avgCpu: 반올림(평균(값들(줄들.map((r) => r.cpu)))),
  };
}

export const 요약값 = (요약: 기기요약, launchMs: number | null): Record<기기지표, number | null> => ({
  AVG_FPS: 요약.avgFps,
  LOW1_FPS: 요약.low1Fps,
  MAX_TEMP: 요약.maxTempC,
  MAX_MEM: 요약.maxMemMb,
  LAUNCH_MS: launchMs,
});

/** 벗어난 목표의 지표들 — 실행 중 타일의 「목표 미달」과 요약 표의 빨간 칸이 이것을 본다 */
export function 벗어난지표(목표들: readonly 기기목표[], 요약: 기기요약, launchMs: number | null): Set<기기지표> {
  const 잰값 = 요약값(요약, launchMs);
  return new Set(목표들.filter((목표) => 벗어남(목표, 잰값[목표.metric])).map((목표) => 목표.metric));
}

export interface 결과칸 {
  이름: string;
  값: string;
  /** 움직임이 올리는 수와 그 수의 글자. 값은 끝 글자다 */
  수: number | null;
  글: (n: number) => string;
  /** 그 값을 낸 기기(여럿일 때만) · 목표 */
  보조: string[];
  나쁨: boolean;
}

type 결과기기 = 기기결과['devices'][number];

/**
 * 결과 화면 위 숫자 칸 줄 — 앱은 CPU · 메모리 · 앱 실행 시간 · 기기 온도, 게임은 FPS · 프레임 드랍 · CPU · 메모리 (시안 11판 「앱 성능 · 게임 성능」 · WEB-F7-16).
 * 시안의 「화면 멈춤」은 기록기가 재지 않아 기기 온도로 바꿨다. 기기가 여럿이면 가장 나쁜 기기의 값이다 — 한 대라도 넘으면 넘은 것이다
 */
export function 결과칸들(게임: boolean, 결과: Pick<기기결과, 'devices' | 'metrics'>, 목표들: readonly 기기목표[], t: 말): 결과칸[] {
  const 여럿 = 결과.devices.length > 1;
  const 드랍 = (serial: string) => 평균(값들(결과.metrics.filter((줄) => 줄.serial === serial).map((줄) => 줄.jankPct)));
  const 칸 = (이름: string, 값: (d: 결과기기) => number | null, 높을수록나쁨: boolean, 글: (n: number) => string, 지표?: 기기지표): 결과칸 => {
    const 잰 = 결과.devices.flatMap((d) => {
      const n = 값(d);
      return n === null ? [] : [{ d, n }];
    });
    const 나쁜 = 잰.reduce<{ d: 결과기기; n: number } | null>((가장, x) => (가장 === null || (높을수록나쁨 ? x.n > 가장.n : x.n < 가장.n) ? x : 가장), null);
    const 목표 = 지표 === undefined ? undefined : 목표들.find((x) => x.metric === 지표);
    const 목표글 = 목표 === undefined || 지표 === undefined ? null : t(목표.op === '>=' ? '목표 {값} 이상' : '목표 {값} 이하', { 값: 값글자(지표, 목표.value, t) });
    return {
      이름,
      값: 나쁜 === null ? '-' : 글(나쁜.n),
      수: 나쁜?.n ?? null,
      글,
      보조: [여럿 && 나쁜 !== null ? 나쁜.d.model : null, 목표글].filter((x): x is string => x !== null),
      나쁨: 나쁜 !== null && 목표 !== undefined && 벗어남(목표, 나쁜.n),
    };
  };
  const 퍼센트 = (n: number) => `${String(한자리(n))}%`;
  const cpu = 칸('CPU 평균', (d) => d.summary.avgCpu, true, 퍼센트);
  const 메모리 = 칸('메모리 최대', (d) => d.summary.maxMemMb, true, 메모리글자, 'MAX_MEM');
  return 게임
    ? [칸('평균 FPS', (d) => d.summary.avgFps, false, (n) => String(한자리(n)), 'AVG_FPS'), 칸('프레임 드랍', (d) => 드랍(d.serial), true, 퍼센트), cpu, 메모리]
    : [cpu, 메모리, 칸('앱 실행 시간', (d) => d.launchMs, true, (n) => 값글자('LAUNCH_MS', n, t), 'LAUNCH_MS'), 칸('최대 기기 온도', (d) => d.summary.maxTempC, true, (n) => 값글자('MAX_TEMP', n, t), 'MAX_TEMP')];
}

/** 그 초를 담은 녹화 조각과 조각 안의 초. 조각은 시작 초 차례로 온다 — 그 초 앞에서 시작한 마지막 조각이다 */
export function 조각찾기(영상들: 기기결과['videos'], serial: string, sec: number): { name: string; 안초: number } | null {
  const 고름 = 영상들.filter((v) => v.serial === serial && v.startSec <= sec).at(-1) ?? 영상들.find((v) => v.serial === serial);
  return 고름 === undefined ? null : { name: 고름.name, 안초: Math.max(0, sec - 고름.startSec) };
}

/** 그래프 한 줄의 점 — 값이 없는 초는 건너뛴다 */
export const 점들 = (줄들: readonly 기기숫자[], 값: (줄: 기기숫자) => number | null): { x: number; y: number }[] =>
  줄들.flatMap((줄) => {
    const y = 값(줄);
    return y === null ? [] : [{ x: 줄.sec, y }];
  });

/** 기기마다 가장 최근 숫자 한 줄 */
export const 최근줄 = (줄들: readonly 기기숫자[], serial: string): 기기숫자 | undefined =>
  줄들.filter((줄) => 줄.serial === serial).reduce<기기숫자 | undefined>((큰, 줄) => (큰 === undefined || 줄.sec > 큰.sec ? 줄 : 큰), undefined);

/** 기기 실행의 config 는 부하 실행 꼴이 아니다 — 서버가 kind DEVICE 에만 이 꼴을 싣는다 (§7 「실행의 config」) */
export const 기기설정of = (run: 실행상세): 기기설정 => run.config as unknown as 기기설정;

/** 측정을 만들면 그 번호 주소로 간다 — 주소마다 새로 그려서 앞 실행의 숫자가 남지 않는다 */
export const 실행열기 = (runId: number) => {
  window.location.hash = `#/perf/devices?run=${String(runId)}`;
};
