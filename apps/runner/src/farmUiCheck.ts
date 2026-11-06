// 호환성 항목의 팜 AI 점검 결과(ui-check.json · 의심 화면 PNG)를 점검이 끝날 때까지 받는다 (SPEC 도메인/호환성 §7 「러너 · kit」)

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR } from '@platform/kit';

import { appium주소 } from './appSession.js';

export const UI_CHECK_FILE = 'ui-check.json';
// 비전이 남기는 화면 PNG 이름(ui-001.png). 팜이 준 이름으로 파일을 만드니 폴더 밖으로 못 나가는 꼴만 받는다
export const 점검화면이름 = /^ui-[\w-]+\.png$/;

export const 다시_ms = 60_000;
// admin 이 미점검으로 닫는 때와 같다 — 둘이 어긋나면 admin 이 닫은 뒤에 결과가 놓인다
export const 상한_ms = 60 * 60_000;
const 부르기_제한_ms = 30_000;

interface 팜파일 { name?: unknown; url?: unknown }

const 알림 = (말: string, err: unknown): void =>
  console.error(`[runner] ${말}: ${err instanceof Error ? err.message : String(err)}`);

/** 'checking' 이면 다시 받는다. 'none' 은 팜이 점검 파일을 안 준다(비전이 꺼졌거나 팜이 아닌 Appium) — 기다려도 안 생긴다 */
async function 한번받는다(폴더: string, base: string, headers: Record<string, string>, sessionId: string): Promise<'checking' | 'saved' | 'none'> {
  const 받기 = async (주소: string): Promise<Response> => {
    // 토큰을 다른 곳에 보내지 않는다
    if (new URL(주소).origin !== new URL(base).origin) throw new Error(`팜 밖 주소다: ${주소}`);
    const res = await fetch(주소, { headers, signal: AbortSignal.timeout(부르기_제한_ms) });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} — ${주소}`), { status: res.status });
    return res;
  };
  let 목록: { ready?: boolean; files?: 팜파일[] } | undefined;
  try {
    목록 = ((await (await 받기(`${base}/api/sessions/${encodeURIComponent(sessionId)}/artifacts`)).json()) as { value?: typeof 목록 }).value;
  } catch (err) {
    // 모르는 세션은 404 다 — 다시 물어도 같다
    if ((err as { status?: number }).status === 404) return 'none';
    throw err;
  }
  if (목록?.ready === false) return 'checking';
  const 파일들 = 목록?.files ?? [];
  const 주소 = (이름: string): string | undefined => {
    const f = 파일들.find((x) => x.name === 이름);
    return typeof f?.url === 'string' ? new URL(f.url, `${base}/`).href : undefined;
  };
  const 점검주소 = 주소(UI_CHECK_FILE);
  if (점검주소 === undefined) return 'none';
  const 원문 = await (await 받기(점검주소)).text();
  const 결과 = JSON.parse(원문) as { status?: unknown; screens?: { file?: unknown }[] };
  // 점검 중인 파일은 두지 않는다 — admin 이 덜 된 결과로 화면 줄을 쓰지 않게
  if (결과.status === 'checking') return 'checking';

  // 다 받은 뒤에 옮긴다. 받기 줄의 farm.part 와 같은 때 돌 수 있어 이름을 따로 둔다
  const 받는곳 = join(폴더, `${FARM_EVIDENCE_DIR}.ui.part`);
  const 둘곳 = join(폴더, FARM_EVIDENCE_DIR);
  try {
    await mkdir(받는곳, { recursive: true });
    const 그림들 = new Set<string>();
    // 같은 그림을 여러 화면 줄이 가리킬 수 있다
    for (const 이름 of new Set((결과.screens ?? []).map((x) => x.file))) {
      if (typeof 이름 !== 'string' || !점검화면이름.test(이름)) continue;
      const u = 주소(이름);
      if (u === undefined) continue;
      let 그림: Response;
      try {
        그림 = await 받기(u);
      } catch (err) {
        // 팜이 지운 그림은 다시 물어도 없다 — 그 그림만 빼고 점검 결과는 둔다
        const 코드 = (err as { status?: number }).status;
        if (코드 !== 404 && 코드 !== 410) throw err;
        알림('의심 화면 그림 하나를 받지 못해 빼고 둔다', err);
        continue;
      }
      await writeFile(join(받는곳, 이름), Buffer.from(await 그림.arrayBuffer()));
      그림들.add(이름);
    }
    await writeFile(join(받는곳, UI_CHECK_FILE), 원문);
    await mkdir(둘곳, { recursive: true });
    // 점검 파일은 맨 끝에 옮긴다 — admin 이 그것을 보고 PNG 를 찾는다
    for (const 이름 of [...그림들, UI_CHECK_FILE]) await rename(join(받는곳, 이름), join(둘곳, 이름));
  } finally {
    await rm(받는곳, { recursive: true, force: true }).catch((e: unknown) => 알림('반쯤 받은 AI 점검 결과를 지우지 못했다', e));
  }
  return 'saved';
}

/**
 * 연결이 닫힌 뒤 부른다 — 비전은 그때부터 점검한다. 점검 중이면 1분마다 다시 받고, 그 항목이 끝난 때(끝난때)부터 60분이 지나면 그만 받는다.
 * 던지지 않는다 — 결과가 없으면 admin 이 미점검으로 닫는다
 */
export async function 점검결과를기다린다(폴더: string, raw: string, sessionId: string, 토큰: string | undefined, 끝난때: number): Promise<void> {
  const { base, headers } = appium주소(raw, 토큰);
  for (;;) {
    try {
      const 됨 = await 한번받는다(폴더, base, headers, sessionId);
      if (됨 === 'saved') return;
      if (됨 === 'none') {
        console.error(`[runner] 팜이 세션 ${sessionId} 의 AI 점검 결과를 주지 않는다 — 그만 받는다`);
        return;
      }
    } catch (err) {
      알림('AI 점검 결과를 받지 못했다 — 1분 뒤 다시 받는다', err);
    }
    if (Date.now() + 다시_ms > 끝난때 + 상한_ms) {
      console.error(`[runner] 세션 ${sessionId} 의 AI 점검이 항목이 끝난 뒤 60분 안에 끝나지 않아 그만 받는다`);
      return;
    }
    await new Promise((ok) => setTimeout(ok, 다시_ms));
  }
}
