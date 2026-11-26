// 앱 해 본 기록 — 잡은 폰에서 명령 묶음을 차례로 돌리고 명령마다 종료 코드 · 출력 앞부분과 묶음 앞뒤 화면 키를 남긴다 (도메인/작성 §3.6 「★ 앱 배우기」 「해 본 기록」)
// appium-cli 가 명령 기록을 안 남겨 이 명령이 남긴다. 보류 · 진행 불가 · 「기획서에만」이 이 파일 이름을 댄다(장치 ② ③ — APP-F5-04)
// 쓰는 법: npx tsx scripts/authoring-app-try.ts <자료 폴더> <이름> <명령 파일> — 명령 파일은 한 줄에 명령 하나(빈 줄 · # 줄은 건너뛴다). 0 다 돎 · 1 명령 하나가 실패해 거기서 멈춤 · 2 부를 수 없음
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 앱배움자리 } from './authoring-app-learned.js';
import { 가림표 } from './authoring-reverse.js';
import { 새로쓰기 } from './authoring-screens-keep-io.js';

const 출력상한 = 2_000;
const 명령상한 = 50;
const 한명령_ms = 5 * 60_000;
// 화면 읽기만 하는 appium-cli 명령은 「본 기록」이다 · 실패로 멈춰 안 돈 줄은 안 센다 — 누르기 · 적기 · 밀기 · 딥링크가 있어야 해 본 기록이다(장치 ② ③)
const 해보는명령 = new Set(['tap', 'click', 'long-press', 'double-tap', 'swipe-in', 'drag', 'pinch-open', 'pinch-close', 'tap-xy', 'draw', 'fill', 'clear', 'swipe', 'press', 'type', 'back', 'deeplink', 'scroll-to']);
// 서비스 도우미는 테스트 폴더의 파일을 tsx 로 부른다(`cd x && npx tsx ./tests/…` 꼴도)
const 도우미꼴 = /(^|[\s;&|])npx\s+tsx\s+(\.\/)?tests\//;
// 값을 띄어 쓰는 appium-cli 옵션 — 그 값을 명령으로 읽지 않게 건너뛴다
const 값옵션 = new Set(['-s', '--session']);

/** 줄 하나가 누르기 · 적기 · 밀기 · 딥링크 · 도우미 부르기인가 */
export function 해보는줄인가(줄: string): boolean {
  if (도우미꼴.test(줄.trim())) return true;
  const 칸 = 줄.trim().split(/\s+/);
  const i = 칸.findIndex((x) => /(^|\/)appium-cli$/.test(x));
  if (i < 0) return false;
  for (let j = i + 1; j < 칸.length; j++) {
    if (값옵션.has(칸[j]!)) j++;
    else if (!칸[j]!.startsWith('-')) return 해보는명령.has(칸[j]!);
  }
  return false;
}

/** 17자리 시각(UTC 연월일시분초 밀리초) — 이름 차례가 시각 차례다 */
export const 시각글 = (ms: number): string => new Date(ms).toISOString().replace(/\D/g, '').slice(0, 17);

export interface 해본기록 {
  이름: string;
  시작: string;
  끝: string;
  앞화면: string | null;
  뒤화면: string | null;
  /** 해 보는 줄이 하나라도 있나 — 없으면 본 기록이다 */
  해봄: boolean;
  명령: { 줄: string; 코드: number | null; 출력: string }[];
  /** 실패해 멈춘 줄 번호(1부터) */
  멈춤?: number;
}

export interface 돌리개 {
  돌린다: (줄: string) => { 코드: number | null; 출력: string };
  /** 지금 앱 화면 키 — 못 읽으면 null */
  화면: () => string | null;
  지금: () => number;
}

const 쉘로: 돌리개 = {
  돌린다: (줄) => {
    const r = spawnSync('sh', ['-c', 줄], { encoding: 'utf8', timeout: 한명령_ms, maxBuffer: 16 * 1024 * 1024 });
    return { 코드: r.status, 출력: `${r.stdout ?? ''}${r.stderr ?? ''}${r.error === undefined ? '' : `\n${r.error.message}`}` };
  },
  화면: () => {
    const r = spawnSync('npx', ['appium-cli', '-s=probe', 'screen'], { encoding: 'utf8', timeout: 60_000 });
    const 키 = (r.stdout ?? '').trim().split('\n')[0]?.split(' · ')[0] ?? '';
    return r.status === 0 && 키.startsWith('app:') ? 키 : null;
  },
  지금: Date.now,
};

export function 실행(인자: string[], 손: 돌리개 = 쉘로, env: NodeJS.ProcessEnv = process.env): number {
  const [자료, 이름, 파일] = 인자;
  if (자료 === undefined || 이름 === undefined || 파일 === undefined || 인자.length !== 3) {
    console.error('쓰는 법: npx tsx scripts/authoring-app-try.ts <자료 폴더> <이름> <명령 파일>');
    return 2;
  }
  if (!/^[\p{L}\p{N}_-]{1,60}$/u.test(이름)) {
    console.error('[해 본 기록] 이름은 글자 · 숫자 · _ · - 로 60자까지다');
    return 2;
  }
  let 줄들: string[];
  try {
    줄들 = readFileSync(파일, 'utf8').split('\n').map((x) => x.trim()).filter((x) => x !== '' && !x.startsWith('#'));
  } catch (e) {
    console.error(`[해 본 기록] 명령 파일을 못 읽었다 — ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  if (줄들.length === 0 || 줄들.length > 명령상한) {
    console.error(`[해 본 기록] 명령은 1 ~ ${String(명령상한)}줄이다`);
    return 2;
  }
  // 긴 것부터 — 한 비밀번호가 다른 것을 품으면 짧은 것을 먼저 가려 긴 것의 뒷부분이 남는다
  const 비밀 = 환경비밀번호들(env).filter((x) => x !== '').sort((a, b) => b.length - a.length);
  const 가리기 = (글: string): string => 비밀.reduce((g, s) => g.split(s).join(가림표), 글);
  const 시작 = 손.지금();
  const 앞화면 = 손.화면();
  const 명령: 해본기록['명령'] = [];
  let 멈춤: number | undefined;
  for (const [i, 줄] of 줄들.entries()) {
    const r = 손.돌린다(줄);
    명령.push({ 줄: 가리기(줄), 코드: r.코드, 출력: 가리기(r.출력.trim()).slice(0, 출력상한) });
    // 앞 명령이 실패한 채 다음을 누르면 엉뚱한 화면을 누른다
    if (r.코드 !== 0) {
      멈춤 = i + 1;
      break;
    }
  }
  const 기록: 해본기록 = {
    이름, 시작: new Date(시작).toISOString(), 끝: new Date(손.지금()).toISOString(), 앞화면, 뒤화면: 손.화면(), 해봄: 줄들.slice(0, 명령.length).some(해보는줄인가), 명령, ...(멈춤 === undefined ? {} : { 멈춤 }),
  };
  const 폴더 = join(자료, 앱배움자리.기록);
  mkdirSync(폴더, { recursive: true });
  const 파일이름 = `${시각글(시작)}-${이름}.json`;
  새로쓰기(join(폴더, 파일이름), JSON.stringify(기록, null, 1));
  const 끝줄 = 명령.at(-1)!;
  console.log([
    `[해 본 기록] ${파일이름} — ${기록.해봄 ? '해 본 기록' : '본 기록(화면 읽기만 — 보류 · 진행 불가의 근거로 안 센다)'} · ${기록.앞화면 ?? '화면 모름'} → ${기록.뒤화면 ?? '화면 모름'}`,
    멈춤 === undefined ? `명령 ${String(명령.length)}줄 다 돎` : `${String(멈춤)}번째 줄이 실패해 멈춤(종료 ${String(끝줄.코드)}) — ${끝줄.출력.slice(0, 300)}`,
  ].join('\n'));
  return 멈춤 === undefined ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = 실행(process.argv.slice(2));
