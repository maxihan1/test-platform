// 러너와 같이 쓰는 artifacts 볼륨에서 바로가기를 거치지 않은 파일만 내준다 (리뷰 M4 · SPEC 공통/6-인프라 §9)
// 볼륨을 같이 안 보는 러너(터널로 이은 맥)의 파일은 여기 없을 때 그 러너에서 받아 와 둔다 (SPEC 공통/3 §5.3 「러너 여러 대」)

import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as 웹흐름 } from 'node:stream/web';

import { 답하나, 러너들, 러너머리 } from './execution/runnerAddr.js';

// 러너가 쓰는 폴더(실행 산출물 · 기기 녹화 · 녹화 실행 HAR). 증적 문서 · 빌드 · 작성 자료는 admin 이 쓰므로 러너에 묻지 않는다.
// 러너 remote.ts 의 내주는뿌리와 같은 목록이다 — 정본은 SPEC 도메인/러너 §5.2 「러너 토큰 · 파일 내주기」
const 러너뿌리 = ['runs', 'perf', 'perf-record'];
// ponytail: 한 파일 상한 하나 — 케이스가 남긴 큰 파일이 서버 디스크를 채우지 못하게. 더 긴 녹화가 생기면 올린다
const 받기상한 = 512 * 1024 * 1024;
const 받기제한ms = 120_000;

// 러너와 어드민이 같은 볼륨을 본다. 경로 규칙은 artifacts/runs/{runId}/{historyId}/{seq}.png (SPEC §9)
export function artifactsDir(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

const 러너것인가 = (상대: string): boolean => 러너뿌리.includes(상대.split(sep)[0] ?? '');

/**
 * 볼륨 안 일반 파일의 실제 자리. 볼륨 밖 · 가는 길에 바로가기가 하나라도 낀 것 · 폴더 · 없는 것은 null 이다.
 * 볼륨에 쓰는 쪽은 root 로 도는 케이스라 바로가기를 막을 수 없고, 바로가기는 읽는 admin 쪽에서 풀린다 —
 * 그대로 읽으면 `1.png` 로 건 /proc/self/environ 이 스크린샷으로 나간다
 */
// ponytail: 확인과 읽기 사이에 폴더를 바꿔치기하는 경합은 남는다(케이스가 끝난 뒤에도 볼륨을 고치는 프로세스가 있어야 한다). 막으려면 러너에는 runs 하위 볼륨만 붙인다
export async function 볼륨파일(경로: string): Promise<string | null> {
  const 상대 = relative(artifactsDir(), 경로);
  if (상대 === '' || 상대 === '..' || 상대.startsWith(`..${sep}`) || isAbsolute(상대)) return null;
  const 자리 = await 확인(경로, 상대);
  if (자리 !== undefined) return 자리;
  // 없는 것만 러너에 묻는다 — 바로가기로 막힌 것까지 받아 오면 막은 뜻이 없다
  return (await 러너에서받는다(상대)) ? ((await 확인(경로, 상대)) ?? null) : null;
}

/** 진짜 자리 · 막힘(null) · 없음(undefined) */
async function 확인(경로: string, 상대: string): Promise<string | null | undefined> {
  try {
    // 뿌리 자체는 바로가기여도 된다(맥 임시 폴더 · 운영자가 건 자리). 그 아래만 본다
    const 진짜 = await realpath(경로);
    if (진짜 !== join(await realpath(artifactsDir()), 상대)) return null;
    return (await stat(진짜)).isFile() ? 진짜 : null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return undefined;
    if (code === 'ENOTDIR' || code === 'ELOOP') return null;
    throw new Error(`볼륨 파일을 확인하지 못했다 (${경로}): ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** readFile 자리에 그대로 쓴다 — 볼륨 안 일반 파일이 아니면 ENOENT 로 던져, 부르는 쪽의 「없는 파일」 처리를 그대로 탄다 */
export async function 볼륨파일읽기(경로: string): Promise<Buffer> {
  const 진짜 = await 볼륨파일(경로);
  if (진짜 === null) throw Object.assign(new Error(`볼륨 안의 일반 파일이 아니다: ${경로}`), { code: 'ENOENT' });
  return readFile(진짜);
}

export interface 볼륨항목 {
  name: string;
  bytes: number;
}

/**
 * 폴더의 일반 파일 이름 · 크기 — 이 볼륨과 러너들의 것을 합친다(같은 이름이면 이 볼륨 것). 둘 다 없으면 빈 목록이다.
 * 내용은 받지 않는다 — 내려받을 때 볼륨파일이 바로가기를 거르고 없으면 받아 온다
 */
export async function 볼륨목록(폴더: string): Promise<볼륨항목[]> {
  const 항목 = new Map<string, number>();
  const 상대 = relative(artifactsDir(), 폴더);
  let 이름들: string[] = [];
  try {
    이름들 = (await readdir(폴더, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`볼륨 폴더를 읽지 못했다 (${폴더}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  for (const name of 이름들) {
    // 가는 길의 폴더가 바로가기면 막는다 — 볼륨파일과 같은 기준이고, 없을 때 받아 오지는 않는다
    const 진짜 = await 확인(join(폴더, name), join(상대, name));
    if (typeof 진짜 === 'string') 항목.set(name, (await stat(진짜)).size);
  }
  if (러너것인가(상대)) {
    // 러너마다 따로 묻고 한 대에 못 닿으면 그 러너 몫만 빠진다 — 진행을 합칠 때와 같다 (SPEC 공통/3 §5.3)
    await Promise.all(
      러너들().map(async (주소) => {
        if (!(await 깨어있나(주소))) return;
        try {
          const res = await fetch(`${주소}/files?dir=${encodeURIComponent(상대)}`, { headers: 러너머리(), signal: AbortSignal.timeout(3_000) });
          if (!res.ok) return;
          const { files } = (await res.json()) as { files?: unknown };
          if (!Array.isArray(files)) return;
          for (const f of files as { name?: unknown; bytes?: unknown }[]) {
            if (typeof f.name === 'string' && f.name !== '' && f.name === basename(f.name) && typeof f.bytes === 'number' && !항목.has(f.name)) 항목.set(f.name, f.bytes);
          }
        } catch {
          // 꺼졌거나 잠든 러너다. 보이는 것만 낸다
        }
      }),
    );
  }
  return [...항목].map(([name, bytes]) => ({ name, bytes }));
}

// 잠든 러너는 30초 동안 다시 묻지 않는다 — 사진 여러 장 · 항목 여러 개를 열 때마다 2초씩 쌓이지 않게
const 잠든때 = new Map<string, number>();
async function 깨어있나(주소: string): Promise<boolean> {
  if (Date.now() - (잠든때.get(주소) ?? Number.NEGATIVE_INFINITY) < 30_000) return false;
  const 답함 = await 답하나(주소);
  if (답함) 잠든때.delete(주소);
  else 잠든때.set(주소, Date.now());
  return 답함;
}

// 같은 파일을 여럿이 한꺼번에 찾으면(영상의 구간 요청 여러 개) 한 번만 받는다
const 받는중 = new Map<string, Promise<boolean>>();
function 러너에서받는다(상대: string): Promise<boolean> {
  const 앞 = 받는중.get(상대);
  if (앞 !== undefined) return 앞;
  const 일 = 받아온다(상대).finally(() => 받는중.delete(상대));
  받는중.set(상대, 일);
  return 일;
}

// 받은 것은 볼륨에 남긴다 — 맥이 잠들어도 한 번 본 사진은 계속 보인다. 실패는 사유만 남기고 「없는 파일」로 친다
async function 받아온다(상대: string): Promise<boolean> {
  if (!러너것인가(상대)) return false;
  for (const 주소 of 러너들()) {
    // 잠든 맥에 120초를 매달리지 않게 먼저 짧게 묻는다
    if (!(await 깨어있나(주소))) continue;
    try {
      const res = await fetch(`${주소}/files?path=${encodeURIComponent(상대)}`, { headers: 러너머리(), signal: AbortSignal.timeout(받기제한ms) });
      const 길이 = res.headers.get('content-length');
      const 크기 = 길이 === null ? Number.NaN : Number(길이);
      if (res.status === 404 || !res.ok || res.body === null || !(크기 <= 받기상한)) {
        if (res.status !== 404) console.warn(`[admin] ${주소} 의 ${상대} 를 받지 않았다 — ${String(res.status)} · ${길이 ?? '길이 없음'}`);
        await res.body?.cancel();
        continue;
      }
      await 볼륨에쓴다(상대, res.body as 웹흐름<Uint8Array>);
      return true;
    } catch (err) {
      console.warn(`[admin] ${주소} 의 ${상대} 를 받지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return false;
}

// ponytail: mkdir 이 가는 길의 바로가기를 따라 볼륨 밖에 빈 폴더를 만들 수는 있다 — 내용은 아래 확인이 막는다
async function 볼륨에쓴다(상대: string, 몸: 웹흐름<Uint8Array>): Promise<void> {
  const 뿌리 = artifactsDir();
  const 폴더 = join(뿌리, dirname(상대));
  await mkdir(폴더, { recursive: true });
  // 옆 러너의 케이스가 건 바로가기를 따라가면 볼륨 밖에 쓴다
  if ((await realpath(폴더)) !== join(await realpath(뿌리), dirname(상대))) throw new Error(`${dirname(상대)} 가는 길에 바로가기가 있다`);
  const 임시 = join(폴더, `.받는중-${randomUUID()}`);
  try {
    await pipeline(Readable.fromWeb(몸), createWriteStream(임시));
    await rename(임시, join(뿌리, 상대));
  } catch (err) {
    await rm(임시, { force: true });
    throw err;
  }
}
