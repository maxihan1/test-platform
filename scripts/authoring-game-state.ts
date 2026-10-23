// 작성 중 상태 도우미 부르기 — 게임 작성 AI 가 helpers/game-state.helper.ts 의 어드민 API 꼴 함수를 하나 불러 본다 (SPEC 도메인/게임 §3.10 「작성 — 한 바퀴」 4 · 「창 훑기」 ④)
// 장소 순간이동 · 조건부 창 조건 만들기 · 스폰 목록 읽기 · 크롤 캐릭터 정리를 이 명령으로 한다. 케이스가 받는 몸통 admin 과 같은 키 · 같은 서버로 부른다
// 쓰는 법: npx tsx scripts/authoring-game-state.ts <테스트 폴더> <함수 이름> ['<인자 JSON 배열>'] — GM 명령 꼴(첫 인자 game) 도우미는 못 부른다(폰 채팅 칸에 control-cli 로 넣는다)

import { lstatSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { request } from '@playwright/test';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 비밀가리기 } from './authoring-reverse.js';

/** 결과 글 상한 — 스폰 목록처럼 큰 답은 대화 토큰을 먹는다. 넘으면 자르고 알린다 */
const 결과상한 = 8_000;

/** 도우미 파일 자리 — 일반 파일만(자식이 둔 링크로 트리 밖 코드를 안 돌린다) */
export function 도우미자리(트리: string, 폴더: string): string | null {
  if (!/^[A-Za-z0-9._-]+$/.test(폴더) || 폴더.startsWith('.')) return null;
  const 자리 = join(트리, 'tests', 폴더, 'helpers', 'game-state.helper.ts');
  return lstatSync(자리, { throwIfNoEntry: false })?.isFile() === true ? 자리 : null;
}

/** 돌려준 값을 찍을 글 — 키 · 계정 값은 가리고 상한에서 자른다 */
export function 결과글(값: unknown, 비밀들: readonly string[]): string {
  const 글 = 비밀가리기(값 === undefined ? '(돌려준 값 없음)' : JSON.stringify(값, null, 2) ?? String(값), 비밀들);
  return 글.length > 결과상한 ? `${글.slice(0, 결과상한)}\n… ${글.length - 결과상한}자 더 있다 — 필요한 칸만 돌려주는 도우미로 좁힌다` : 글;
}

/** 에이전트가 넘긴 PLATFORM_ADMIN_KEY — 깨졌으면 없는 것으로 본다(값을 글에 싣지 않는다) */
function 어드민키(글: string | undefined): { header: string; value: string } | null {
  try {
    const 키 = JSON.parse(글 || 'null') as { header?: unknown; value?: unknown } | null;
    return typeof 키?.header === 'string' && typeof 키.value === 'string' ? { header: 키.header, value: 키.value } : null;
  } catch {
    return null;
  }
}

/** 0 불렀다 · 1 도우미가 던졌다 · 2 부를 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const [폴더, 이름, 인자글] = 인자;
  if (폴더 === undefined || 이름 === undefined || !/^[\p{L}\p{N}_$]+$/u.test(이름)) {
    console.error("쓰는 법: npx tsx scripts/authoring-game-state.ts <테스트 폴더> <함수 이름> ['<인자 JSON 배열>']");
    return 2;
  }
  const 키 = 어드민키(env.PLATFORM_ADMIN_KEY);
  if (키 === null || !env.PLATFORM_BASE_URL) {
    console.error('[상태 도우미] 어드민 키가 없다(앱 줄에 어드민 키가 없다) — 도우미를 못 부른다. 그 준비가 필요한 창 · 케이스는 보류다');
    return 2;
  }
  let 넘길: unknown[];
  try {
    const 값 = JSON.parse(인자글 ?? '[]') as unknown;
    if (!Array.isArray(값)) throw new Error('배열이 아니다');
    넘길 = 값;
  } catch (e) {
    console.error(`[상태 도우미] 인자는 JSON 배열로 준다 — ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }
  const 자리 = 도우미자리(트리, 폴더);
  if (자리 === null) {
    console.error(`[상태 도우미] tests/${폴더}/helpers/game-state.helper.ts 가 없다 — 서비스 가이드로 도우미를 먼저 쓴다`);
    return 2;
  }
  const 비밀들 = 환경비밀번호들(env);
  const 모듈 = (await import(pathToFileURL(자리).href)) as Record<string, unknown>;
  const 함수 = 모듈[이름];
  if (typeof 함수 !== 'function') {
    console.error(`[상태 도우미] 「${이름}」 은 도우미 파일이 내보낸 함수가 아니다 — 있는 것: ${Object.keys(모듈).filter((k) => typeof 모듈[k] === 'function').join(' · ') || '없음'}`);
    return 2;
  }
  const admin = await request.newContext({ baseURL: env.PLATFORM_BASE_URL, extraHTTPHeaders: { [키.header]: 키.value } });
  try {
    const 값: unknown = await (함수 as (...a: unknown[]) => unknown)(admin, ...넘길);
    console.log(`[상태 도우미] ${이름} 불렀다\n${결과글(값, 비밀들)}`);
    return 0;
  } catch (e) {
    console.error(`[상태 도우미] ${이름} 이 던졌다 — ${비밀가리기(e instanceof Error ? e.message : String(e), 비밀들)}`);
    return 1;
  } finally {
    await admin.dispose();
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await 실행(process.argv.slice(2));
}
