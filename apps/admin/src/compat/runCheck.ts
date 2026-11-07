// 호환성 케이스 한 번의 AI 점검 받기 — 폰 Chrome 켜기(점검 켬) · 러너가 받아 둔 점검 파일 · 팜 Chrome 세션 점검 파일 · 끝날 때까지 기다려 화면 줄로 남기기 (도메인/호환성 §3.13 「실행」 2 · 5)

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ExecuteResponse } from '@platform/kit';
import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';

import { 볼륨파일읽기 } from '../artifactFile.js';
import { 팜머리 } from '../execution/farm.js';
import { 점검저장 } from './runStore.js';
import { type 점검파일, type 화면파일, 그림이름, 점검읽기, 화면줄들 } from './uiCheck.js';

// 간격 · 상한은 한 곳에 둔다 — 검사가 짧게 줄여 쓴다
export const 설정 = {
  /** 남은 상태가 모두 사용 중이면 다시 보는 간격 */
  다시잡기ms: 30_000,
  /** 한 상태를 이만큼 못 잡으면 건너뛴다 — 다른 상태가 도는 시간은 안 센다 */
  잡기상한ms: 30 * 60_000,
  /** 점검 결과를 다시 보는 간격 — 러너가 1분마다 받는다 */
  점검간격ms: 60_000,
  /** 케이스가 끝난 뒤 이만큼 지나도 점검이 안 끝나면 미점검 — 러너가 그만 받는 때와 같은 잣대다 (§7 「러너 · kit」) */
  점검상한ms: 60 * 60_000,
};

const 팜제한ms = 10_000;
const Chrome제한ms = 40_000;
const 쉬기 = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const 글 = (e: unknown) => (e instanceof Error ? e.message : String(e));

export interface 팜곳 {
  runId: number;
  팜: string;
  토큰: string | undefined;
}

export async function Chrome켜기(곳: 팜곳, serial: string): Promise<{ cdpUrl: string; sessionId: string | undefined } | { 까닭: string }> {
  try {
    const res = await fetch(`${곳.팜}/api/devices/${encodeURIComponent(serial)}/chrome`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...팜머리(process.env, 곳.토큰) },
      body: JSON.stringify({ uiCheck: true }),
      signal: AbortSignal.timeout(Chrome제한ms),
    });
    const 값 = ((await res.json().catch(() => null)) as { value?: { cdpUrl?: unknown; sessionId?: unknown; message?: unknown } } | null)?.value;
    if (!res.ok) return { 까닭: `Device VISION 이 폰 Chrome 을 켜지 못했습니다: ${typeof 값?.message === 'string' ? 값.message : `HTTP ${res.status}`}` };
    if (typeof 값?.cdpUrl !== 'string' || !/^wss?:\/\//.test(값.cdpUrl)) return { 까닭: 'Device VISION 이 폰 Chrome 연결 주소를 주지 않았습니다' };
    // 세션 번호를 안 주는 옛 비전이면 점검 없이 돈다 — 그 화면은 미점검이다
    return { cdpUrl: 값.cdpUrl, sessionId: typeof 값.sessionId === 'string' && /^[\w-]+$/.test(값.sessionId) ? 값.sessionId : undefined };
  } catch (e) {
    return { 까닭: `Device VISION 에 닿지 못했습니다: ${글(e)}` };
  }
}

export const 점검폴더 = (runId: number, id: number) => join(runDir(String(runId), String(id)), FARM_EVIDENCE_DIR);

/** 러너가 받아 둔 끝난 점검 파일(앱 · 게임). 아직 없으면 null. 있는데 못 읽으면 던진다 — 기다려도 안 고쳐진다 */
async function 러너점검(runId: number, id: number): Promise<점검파일 | null> {
  let 글자: string;
  try {
    글자 = (await 볼륨파일읽기(join(점검폴더(runId, id), 'ui-check.json'))).toString('utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`러너가 받아 둔 점검 파일을 읽지 못했습니다: ${글(e)}`);
  }
  const 점검 = 점검읽기(JSON.parse(글자));
  if (점검 === null) throw new Error('러너가 받아 둔 점검 파일의 꼴이 틀립니다');
  return 점검;
}

/**
 * 팜에서 Chrome 세션의 점검 파일을 받는다. 아직 못 받으면 null — 다음 간격에 다시 본다.
 * 끝났으면 의심 화면 그림도 실행 폴더에 받아 둔다(팜 30일 보관과 상관없이 남게). 그림 하나를 못 받아도 화면 줄은 남긴다 — 카드에 그림만 빈다
 */
async function Chrome점검(곳: 팜곳, id: number, sid: string): Promise<점검파일 | null | '없음'> {
  const 주소 = `${곳.팜}/api/sessions/${encodeURIComponent(sid)}/artifacts`;
  const res = await fetch(`${주소}/ui-check.json`, { headers: 팜머리(process.env, 곳.토큰), signal: AbortSignal.timeout(팜제한ms) }).catch((e: unknown) => {
    console.error(`[compat] 케이스 ${id} 의 Chrome 점검 파일을 못 받았다(다음에 다시): ${글(e)}`);
    return null;
  });
  // 모르는 세션이면 기다려도 안 생긴다 — 러너의 「한 번 묻고 그만」과 같다 (§7 「러너 · kit」)
  if (res?.status === 404) return '없음';
  if (res === null || !res.ok) return null;
  const 점검 = 점검읽기(await res.json().catch(() => null));
  if (점검 === null || 점검.status === 'checking') return 점검;
  const 폴더 = 점검폴더(곳.runId, id);
  await mkdir(폴더, { recursive: true });
  for (const f of new Set(점검.screens.flatMap((x) => (x.file !== undefined && 그림이름.test(x.file) ? [x.file] : [])))) {
    try {
      const 그림 = await fetch(`${주소}/${f}`, { headers: 팜머리(process.env, 곳.토큰), signal: AbortSignal.timeout(팜제한ms) });
      if (그림.ok) await writeFile(join(폴더, f), Buffer.from(await 그림.arrayBuffer()));
    } catch (e) {
      console.error(`[compat] 케이스 ${id} 의 의심 화면 ${f} 를 못 받았다: ${글(e)}`);
    }
  }
  return 점검;
}

/**
 * 점검이 끝날 때까지 받아 화면 줄로 남긴다. 케이스가 끝난 뒤 60분이 지나면 미점검(missing)이다.
 * 받다 깨지면 미점검으로 닫는다 — checking 에 남으면 그 상태 · 실행이 끝나지 않는다
 */
export async function 점검기다리기(곳: 팜곳, c: { id: number; tcId: string }, 파일들: 화면파일[], 끝: number, 결과: ExecuteResponse, Chrome세션: string | undefined): Promise<void> {
  try {
    for (;;) {
      await 쉬기(설정.점검간격ms);
      const 점검 = Chrome세션 === undefined ? await 러너점검(곳.runId, c.id) : await Chrome점검(곳, c.id, Chrome세션);
      if (점검 === '없음') {
        await 점검저장(c.id, 'missing', []);
        return;
      }
      if (점검 !== null && 점검.status !== 'checking') {
        await 점검저장(c.id, 점검.status, 화면줄들(점검, c.tcId, 파일들, 끝, 결과.steps));
        return;
      }
      if (Date.now() - 끝 >= 설정.점검상한ms) {
        await 점검저장(c.id, 'missing', []);
        return;
      }
    }
  } catch (e) {
    console.error(`[compat] 케이스 ${c.id} 점검 결과를 받다 깨져 미점검으로 닫는다: ${글(e)}`);
    await 점검저장(c.id, 'missing', []).catch((x: unknown) => console.error(`[compat] 케이스 ${c.id} 를 미점검으로도 못 닫았다(다시 켜기 정리가 닫는다): ${글(x)}`));
  }
}
