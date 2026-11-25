// 조작 도우미 부를 준비 — 도우미 파일 자리 찾기 · 인자 읽기 · 함수 가져오기 (authoring-game-play · -watch · -wins 가 같이 쓴다)
import { lstatSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 게임자료환경 } from './authoring-check-game.js';
import { 비밀가리기 } from './authoring-reverse.js';
import { 게임환경, 돌발팝업값 } from './authoring-run3-env.js';
import { 잡은폰 } from './authoring-run3-game.js';

/** 셸 명령의 기본 한도(2분)에 게임에 붙는 시간과 거두는 시간을 남긴다 */
const 기본초 = 90;
/** 셸 명령의 최대 한도(10분)에 붙는 시간(켜지는 중이면 2분)과 거두는 시간을 남긴다 */
const 최대초 = 420;
/** 도우미 파일 자리 — 일반 파일이고 실제 자리가 트리의 tests 안일 때만(상태 도우미 부르기와 같은 검사) */
export function 조작도우미자리(트리: string, 폴더: string, 이름: string): string | null {
  // 도우미 이름은 올릴 때 받는 꼴(공통/2 「파일 자리」)과 같다 — 돌려 볼 때만 되는 이름을 막는다
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(폴더) || !/^[a-z][a-z0-9-]{0,40}$/.test(이름)) return null;
  const 자리 = join(트리, 'tests', 폴더, 'helpers', `${이름}.helper.ts`);
  if (lstatSync(자리, { throwIfNoEntry: false })?.isFile() !== true) return null;
  return realpathSync(자리) === join(realpathSync(join(트리, 'tests')), 폴더, 'helpers', `${이름}.helper.ts`) ? 자리 : null;
}

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export interface 부를것 {
  폴더: string;
  파일: string;
  이름: string;
  자리: string;
  넘길: unknown[];
  초: number;
  함수: (game: unknown) => unknown;
  환경: Record<string, string | undefined>;
  비밀들: string[];
  자료: string | undefined;
}

/** 인자를 보고 함수를 찾는다 — 부를 수 없으면 까닭을 찍고 null */
export async function 부를준비(명령: string, 머리: string, 인자: string[], 트리: string, env: NodeJS.ProcessEnv): Promise<부를것 | null> {
  const 한도자리 = 인자.indexOf('--max');
  const 초 = 한도자리 < 0 ? 기본초 : Number(인자[한도자리 + 1]);
  const [폴더, 파일, 이름, 인자글, ...남음] = 한도자리 < 0 ? 인자 : [...인자.slice(0, 한도자리), ...인자.slice(한도자리 + 2)];
  if (폴더 === undefined || 파일 === undefined || 이름 === undefined || 남음.length > 0 || !/^[\p{L}\p{N}_$]+$/u.test(이름) || !(초 > 0 && 초 <= 최대초)) {
    console.error(`쓰는 법: npx tsx scripts/${명령}.ts <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초 — ${최대초}까지>]`);
    return null;
  }
  const 폰 = 잡은폰(트리);
  if (폰 === null) {
    console.error(`${머리} 잡은 디바이스가 없다 — \`npx control-cli hold --minutes 30\`(PC 게임은 \`--pc\`)으로 잡고 게임을 켠 뒤 다시 부른다`);
    return null;
  }
  let 넘길: unknown[];
  let 비밀들: string[];
  try {
    const 값 = JSON.parse(인자글 ?? '[]') as unknown;
    if (!Array.isArray(값)) throw new Error('인자는 JSON 배열로 준다');
    넘길 = 값;
    비밀들 = 환경비밀번호들(env);
  } catch (e) {
    console.error(`${머리} ${까닭(e)}`);
    return null;
  }
  const 자리 = 조작도우미자리(트리, 폴더, 파일);
  if (자리 === null) {
    console.error(`${머리} tests/${폴더}/helpers/${파일}.helper.ts 가 없다 — 먼저 쓴다(이름은 영문 소문자 · 숫자 · -)`);
    return null;
  }
  let 모듈: Record<string, unknown>;
  try {
    모듈 = (await import(pathToFileURL(자리).href)) as Record<string, unknown>;
  } catch (e) {
    console.error(`${머리} 도우미 파일을 못 읽었다 — ${비밀가리기(까닭(e), 비밀들)}`);
    return null;
  }
  const 함수 = 모듈[이름];
  if (typeof 함수 !== 'function') {
    console.error(`${머리} 「${이름}」 은 도우미 파일이 내보낸 함수가 아니다 — 있는 것: ${Object.keys(모듈).filter((k) => typeof 모듈[k] === 'function').join(' · ') || '없음'}`);
    return null;
  }
  const 자료 = env[게임자료환경];
  const 환경 = { ...env, ...게임환경(폰), PLATFORM_PAD: '', PLATFORM_GAME_POPUPS: 돌발팝업값(자료) };
  return { 폴더, 파일, 이름, 자리, 넘길, 초, 함수: (game) => (함수 as (...a: unknown[]) => unknown)(game, ...넘길), 환경, 비밀들, 자료 };
}
