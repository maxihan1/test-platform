// 안정화 지표 몫으로 통과한 정기 실행 android 항목의 팜 logcat 하나만 받는다 (SPEC 도메인/안정화 §3.15 결정 3 · 러너 §5.2 「증적 영상 · logcat」)

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR } from '@platform/kit';

import { appium주소 } from './appSession.js';

export const LOGCAT_FILE = 'logcat.txt';

// appium-cli farmArtifacts 와 같은 기다림 — 팜이 산출물을 다 만들기 전이면 ready:false 다
export const 준비_기다림_ms = 15_000;
export const 준비_간격_ms = 3_000;
// ponytail: logcat 한 벌 10분 상한(appium-cli 내려받기와 같다) — 긴 연결의 logcat 이 끊기면 늘린다
const 받기_제한_ms = 600_000;
const 목록_제한_ms = 30_000;

/**
 * 영상(조각 하나가 100MB 를 넘는다)은 받지 않고 산출물 목록에서 logcat.txt 만 받아 farm/logcat.txt 에 둔다.
 * appium-cli 에 파일 고르기가 없어 팜 목록을 직접 읽는다 — 호환성 점검 결과 받기(farmUiCheck.ts)와 같은 꼴이다.
 * 던진다 — 부르는 쪽이 알리고 넘어간다. 못 받으면 admin 이 기다림 상한 뒤 「기록 없음」으로 센다
 */
export async function logcat만받는다(폴더: string, raw: string, sessionId: string, 토큰: string | undefined, 쉬기 = (ms: number) => new Promise((ok) => setTimeout(ok, ms))): Promise<void> {
  const { base, headers } = appium주소(raw, 토큰);
  const 받기 = async (주소: string, 제한: number): Promise<Response> => {
    // 토큰을 다른 곳에 보내지 않는다
    if (new URL(주소).origin !== new URL(base).origin) throw new Error(`팜 밖 주소다: ${주소}`);
    const res = await fetch(주소, { headers, signal: AbortSignal.timeout(제한) });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${주소}`);
    return res;
  };
  const 목록주소 = `${base}/api/sessions/${encodeURIComponent(sessionId)}/artifacts`;
  const 끝 = Date.now() + 준비_기다림_ms;
  let 목록: { ready?: boolean; files?: { name?: unknown; url?: unknown }[] } | undefined;
  for (;;) {
    목록 = ((await (await 받기(목록주소, 목록_제한_ms)).json()) as { value?: typeof 목록 }).value;
    if (목록?.ready !== false) break;
    if (Date.now() >= 끝) throw new Error(`팜이 세션 ${sessionId} 산출물을 ${준비_기다림_ms / 1000}초 안에 다 만들지 못했다(ready:false)`);
    await 쉬기(준비_간격_ms);
  }
  const 파일 = (목록?.files ?? []).find((f) => f.name === LOGCAT_FILE);
  if (typeof 파일?.url !== 'string') throw new Error(`팜이 세션 ${sessionId} 의 ${LOGCAT_FILE} 을 주지 않는다`);
  const 글 = Buffer.from(await (await 받기(new URL(파일.url, `${base}/`).href, 받기_제한_ms)).arrayBuffer());
  // 다 받은 뒤 옮긴다 — admin 이 덜 받은 logcat 으로 집계하지 않게. 이름은 받기 줄의 farm.part · 점검의 farm.ui.part 와 따로 둔다
  const 받는곳 = join(폴더, `${FARM_EVIDENCE_DIR}.logcat.part`);
  try {
    await mkdir(받는곳, { recursive: true });
    await writeFile(join(받는곳, LOGCAT_FILE), 글);
    await mkdir(join(폴더, FARM_EVIDENCE_DIR), { recursive: true });
    await rename(join(받는곳, LOGCAT_FILE), join(폴더, FARM_EVIDENCE_DIR, LOGCAT_FILE));
  } finally {
    await rm(받는곳, { recursive: true, force: true });
  }
}
