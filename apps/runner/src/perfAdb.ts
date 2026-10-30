// 기기 성능 기록기가 adb 로 폰을 부르는 길과 출력 해석 (SPEC 도메인/러너 「성능 테스트 — 녹화 실행 · 기기 측정」)

import { execFile, spawn } from 'node:child_process';

/** adb 인자를 주면 표준 출력을 돌려준다. 테스트가 가짜를 넣는다. 제한은 명령마다 10초가 기본이다 */
export type Adb = (args: string[], 제한ms?: number) => Promise<string>;

/** 화면 녹화처럼 오래 도는 adb 자식. ChildProcess 가 이 꼴을 만족한다 */
export interface 녹화자식 {
  kill(signal?: NodeJS.Signals): boolean;
  on(event: 'exit' | 'error', cb: () => void): unknown;
}
export type 녹화를띄운다 = (args: string[]) => 녹화자식;

// 셸 문자열이 아니라 인자 배열로 부른다. 다만 `adb shell` 은 뒤 인자를 폰 셸에 한 줄로 넘기므로 값 꼴은 호출 쪽 입구에서 좁힌다
export const 기본Adb: Adb = (args, 제한ms = 10_000) =>
  new Promise((resolve, reject) => {
    execFile('adb', args, { timeout: 제한ms, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(new Error(`adb ${args.join(' ')} 실패: ${err.message}`));
      else resolve(stdout);
    });
  });

export const 기본녹화: 녹화를띄운다 = (args) => spawn('adb', args, { stdio: 'ignore' });

export interface 기기 {
  serial: string;
  model: string;
  os: string;
}

export interface 프레임수 {
  total: number;
  janky: number;
  /** 폰이 덤프를 뜬 시각(ms). 두 읽기 사이에 실제로 흐른 시간을 재는 데 쓴다 */
  uptimeMs: number | null;
  /** 그리는 데 0.7초 넘게 걸린 프레임 수(프리징). 프레임 시간 막대가 없으면 null */
  frozen: number | null;
}

export interface 틱 {
  proc: number;
  total: number;
}

const INT64_MAX = '9223372036854775807';

/** `adb devices -l` 에서 `device` 상태인 serial 만 */
export function 연결된serial들(out: string): string[] {
  return out
    .split('\n')
    .map((l) => l.trim().match(/^(\S+)\s+device(\s|$)/))
    .flatMap((m) => (m === null ? [] : [m[1]]));
}

export function gfxinfo를읽는다(out: string): 프레임수 | null {
  const total = out.match(/Total frames rendered:\s*(\d+)/);
  const janky = out.match(/Janky frames:\s*(\d+)/);
  if (total === null || janky === null) return null;
  const uptime = out.match(/^Uptime:\s*(\d+)/m);
  // 막대 칸 이름이 그 칸의 프레임 시간(ms)이다. 「GPU HISTOGRAM」 줄은 GPU 만 잰 것이라 줄 머리로 거른다.
  // 0.7초는 Android 가 정지된 프레임(frozen frame)으로 세는 기준이다
  const 막대 = out.match(/^\s*HISTOGRAM:(.*)$/m);
  const frozen = 막대 === null ? null : [...막대[1].matchAll(/(\d+)ms=(\d+)/g)].reduce((합, m) => (Number(m[1]) > 700 ? 합 + Number(m[2]) : 합), 0);
  return { total: Number(total[1]), janky: Number(janky[1]), uptimeMs: uptime === null ? null : Number(uptime[1]), frozen };
}

/** `dumpsys SurfaceFlinger --list` 에서 그 패키지가 든 SurfaceView 층 이름. 작은따옴표가 든 이름은 셸에 못 넣어 건너뛴다 */
export function surfaceView층을찾는다(out: string, pkg: string): string | null {
  const 줄 = out.split('\n').map((l) => l.trim());
  return 줄.find((l) => l.includes(pkg) && l.includes('SurfaceView') && !l.includes("'")) ?? null;
}

/** `--latency` 의 둘째 칸(실제 표시 시각, ns). 첫 줄은 갱신 주기, 0 은 아직 안 쓴 칸 · INT64_MAX 는 아직 안 그려진 칸이다.
 *  꽉참 — 안 쓴 칸이 없다. 층의 기록 칸이 다 차서 오래된 프레임이 밀려났을 수 있다 */
export function 프레임시각들(out: string): { 시각: number[]; 꽉참: boolean } {
  const 시각: number[] = [];
  let 꽉참 = true;
  for (const l of out.split('\n')) {
    const 칸 = l.trim().split(/\s+/);
    if (칸.length !== 3 || !칸.every((c) => /^\d+$/.test(c))) continue;
    if (칸[1] === '0') 꽉참 = false;
    if (칸[1] === '0' || 칸[1] === INT64_MAX) continue;
    시각.push(Number(칸[1]));
  }
  return { 시각, 꽉참 };
}

/** `cat /proc/<pid>/stat /proc/stat` 출력에서 앱의 utime+stime 과 전체 틱 합계. 앱 이름에 괄호 · 공백이 있을 수 있어 마지막 `)` 뒤로 자른다 */
export function cpu틱을읽는다(out: string): 틱 | null {
  const 줄 = out.split('\n');
  const 앱 = 줄.find((l) => /^\d+ \(/.test(l));
  const 전체 = 줄.find((l) => /^cpu\s/.test(l));
  if (앱 === undefined || 전체 === undefined) return null;
  const 뒤 = 앱.slice(앱.lastIndexOf(')') + 1).trim().split(/\s+/);
  const utime = Number(뒤[11]);
  const stime = Number(뒤[12]);
  // guest 는 user 에 이미 들어 있어 앞 8칸만 더한다
  const total = 전체.trim().split(/\s+/).slice(1, 9).reduce((a, c) => a + Number(c), 0);
  if (!Number.isFinite(utime) || !Number.isFinite(stime) || !Number.isFinite(total)) return null;
  return { proc: utime + stime, total };
}

/** `dumpsys meminfo` 의 TOTAL PSS(KB)를 MB 로 */
export function 메모리Mb를읽는다(out: string): number | null {
  const m = out.match(/TOTAL PSS:\s*(\d+)/) ?? out.match(/^\s*TOTAL\s+(\d+)/m);
  return m === null ? null : Math.round(Number(m[1]) / 1024);
}

/** 온도는 0.1°C 단위로 온다 */
export function 배터리를읽는다(out: string): { tempC: number | null; batteryPct: number | null } {
  const t = out.match(/temperature:\s*(-?\d+)/);
  const l = out.match(/level:\s*(\d+)/);
  return { tempC: t === null ? null : Number(t[1]) / 10, batteryPct: l === null ? null : Number(l[1]) };
}

/** `resolve-activity --brief` 마지막 줄의 컴포넌트. 셸에 들어가므로 꼴이 맞을 때만 돌려준다 */
export function 컴포넌트를읽는다(out: string): string | null {
  const 마지막 = out.split('\n').map((l) => l.trim()).filter((l) => l !== '').at(-1);
  return 마지막 !== undefined && /^[\w.$]+\/[\w.$]+$/.test(마지막) ? 마지막 : null;
}

export function totalTime을읽는다(out: string): number | null {
  const m = out.match(/TotalTime:\s*(\d+)/);
  return m === null ? null : Number(m[1]);
}

/** adb 에 붙은 폰 목록. adb 가 없거나 실패하면 빈 목록이다 */
export async function 기기목록(adb: Adb): Promise<기기[]> {
  let serials: string[];
  try {
    serials = 연결된serial들(await adb(['devices', '-l']));
  } catch (err) {
    console.warn(`[runner] adb 기기 목록을 못 읽었다: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
  const 기기들: 기기[] = [];
  for (const serial of serials) {
    const prop = async (이름: string) => {
      try {
        return (await adb(['-s', serial, 'shell', 'getprop', 이름])).trim();
      } catch {
        return '';
      }
    };
    기기들.push({ serial, model: await prop('ro.product.model'), os: await prop('ro.build.version.release') });
  }
  return 기기들;
}
