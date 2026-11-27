// 지켜보기 — 게임을 배우는 AI 가 판에 무엇이 있고 무엇이 생기고 움직이고 사라지고 바뀌나를 이름으로 어림하지 않고 통째로 받아 본다 (도메인/게임 §3.10 「지켜보기」)
// 쓰는 법: npx tsx scripts/authoring-game-watch.ts [--sec 15] [--near <주소>] [--nested] [--get <이름>:<컴포넌트.칸>]… [--shots <초>] [--do <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초>] [--shots <초>] [--freeze]]
// --do 를 주면 그 조작 도우미를 돌리는 동안 본다 — 행동 앞뒤로 무엇이 바뀌었나. 잡은 디바이스에서 게임을 켜 둔 채 부른다

import { pathToFileURL } from 'node:url';

import { gameLink } from '@platform/kit/game';
import { Game, type Link } from 'control-cli';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 게임자료환경 } from './authoring-check-game.js';
import { 기본화면초, 부를준비 } from './authoring-game-play-call.js';
import { 지금지도 } from './authoring-game-find.js';
import { 멈춤표시읽기 } from './authoring-game-freeze.js';
import { 판기록들 } from './authoring-learn-check.js';
import { 계획없이초, 배우는중인가, 배움막기 } from './authoring-learn-retro.js';
import { 기록남기기, 덧줄 } from './authoring-game-play-log.js';
import { type 조작결과, 돌린다 } from './authoring-game-play.js';
import { 정리알림 } from './authoring-game-find.js';
import { 결과글 } from './authoring-game-state.js';
import { 새본것, 본다 } from './authoring-game-watch-look.js';
import { 요약 } from './authoring-game-watch-report.js';
import { 비밀가리기 } from './authoring-reverse.js';
import { 게임환경, 돌발팝업값 } from './authoring-run3-env.js';
import { 잡은폰 } from './authoring-run3-game.js';

const 기본초 = 15;
const 최대초 = 300;
/** 게임이 멎었을 때 기다리는 한도 — 셸이 먼저 끊으면 기록이 없다 */
const 거둠ms = 25_000;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const 쉼 = (ms: number): Promise<void> => new Promise((깨운다) => setTimeout(깨운다, ms));

export interface 인자들 {
  초: number;
  곁: string | null;
  칸: Record<string, string[]>;
  안에든것: boolean;
  할일: string[] | null;
  /** 도중 화면 간격(초) — 0 은 끔. `--do` 를 줄 때는 그 뒤 인자의 `--shots` 가 이긴다 */
  화면초: number;
}

export function 인자읽기(인자: readonly string[]): 인자들 | null {
  const r: 인자들 = { 초: 기본초, 곁: null, 칸: {}, 안에든것: false, 할일: null, 화면초: 기본화면초 };
  for (let i = 0; i < 인자.length; i += 2) {
    const [이름, 값] = [인자[i], 인자[i + 1]];
    if (이름 === '--nested') {
      r.안에든것 = true;
      i -= 1;
      continue;
    }
    if (이름 === '--do') {
      r.할일 = 인자.slice(i + 1);
      return r.할일.length >= 3 ? r : null;
    }
    if (값 === undefined) return null;
    if (이름 === '--sec') r.초 = Number(값);
    else if (이름 === '--shots') {
      if (!/^\d+$/.test(값) || Number(값) > 최대초) return null;
      r.화면초 = Number(값);
    }
    else if (이름 === '--near') r.곁 = 값;
    else if (이름 === '--get') {
      const m = /^(.+):([\p{L}\p{N}_]+(?:\.[\p{L}\p{N}_]+)+)$/u.exec(값);
      if (m === null) return null;
      (r.칸[m[1]!] ??= []).push(m[2]!);
    } else return null;
  }
  return r.초 > 0 && r.초 <= 최대초 ? r : null;
}

/** 0 끝까지 봤다 · 1 같이 돌린 함수가 던졌다 · 2 볼 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const a = 인자읽기(인자);
  if (a === null) {
    console.error(`쓰는 법: npx tsx scripts/authoring-game-watch.ts [--sec <초 — ${최대초}까지>] [--near <주소>] [--nested] [--get <이름>:<컴포넌트.칸>]… [--shots <초 — 0 은 끔>] [--do <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <초>] [--shots <초>] [--freeze]]`);
    return 2;
  }
  const 폰 = 잡은폰(트리);
  if (폰 === null) {
    console.error('[지켜보기] 잡은 디바이스가 없다 — `npx control-cli hold --minutes 30`(PC 게임은 `--pc`)으로 잡고 게임을 켠 뒤 다시 부른다');
    return 2;
  }
  const 것 = a.할일 === null ? null : await 부를준비('authoring-game-watch', '[지켜보기]', a.할일, 트리, env);
  if (a.할일 !== null && 것 === null) return 2;
  const 자료 = env[게임자료환경];
  // 학습 세션의 지켜보기 --do 는 짧은 재기다 — 앞 회고가 없거나 60초를 넘기면 조작 도우미 --plan 으로 해 본다
  const 할초 = 것 === null ? 0 : 배우는중인가(자료) && !것.초준 ? Math.min(것.초, 계획없이초) : 것.초;
  const 막 = 것 === null ? null : 배움막기(자료, 할초, undefined, (자료 === undefined ? null : 지금지도(자료))?.줄들 ?? [], 자료 === undefined ? [] : 판기록들(자료));
  if (막 !== null && '막음' in 막) {
    console.error(`[지켜보기] ${막.막음}`);
    return 2;
  }
  let 비밀들: string[];
  try {
    비밀들 = 것?.비밀들 ?? 환경비밀번호들(env);
  } catch (e) {
    console.error(`[지켜보기] ${까닭(e)}`);
    return 2;
  }
  const 환경 = 것?.환경 ?? { ...env, ...게임환경(폰), PLATFORM_PAD: '', PLATFORM_GAME_POPUPS: 돌발팝업값(자료) };
  const 끊기 = new AbortController();
  const 끊음 = (): void => 끊기.abort();
  process.once('SIGTERM', 끊음);
  process.once('SIGINT', 끊음);
  // 지켜보기는 시작할 때 멈춘 게임을 풀고 끝나도 흐르게 둔다 — 학습 세션이면 멈춰 있던 판은 끝에 다시 멈춘다
  const 다시멈춤 = 배우는중인가(자료) && 자료 !== undefined && 멈춤표시읽기(자료) !== null;
  let 그만 = false;
  let r: 조작결과;
  const 본 = 새본것();
  try {
    const 연결 = 길 ?? (await gameLink(환경));
    let 보기: Promise<void> | undefined;
    // 행동 앞의 모습을 먼저 본다 — 함수가 짧아도 앞뒤를 견준다
    await Promise.race([new Promise<void>((봤다) => {
      보기 = 본다(new Game(연결), a, () => 그만, 본, 봤다);
      보기.then(봤다, 봤다);
    }), 쉼(거둠ms)]);
    r = await 돌린다(연결, 것?.함수 ?? (() => 쉼(a.초 * 1000)), 환경, (것 === null ? a.초 + 5 : 할초) * 1000, 끊기.signal, { 도중화면ms: (것?.화면초 ?? a.화면초) * 1000, 멈춤: 것?.멈춤 === true || 다시멈춤, 자료 });
    그만 = true;
    await Promise.race([보기, 쉼(거둠ms)]);
  } catch (e) {
    console.error(`[지켜보기] 게임에 못 붙었다 — ${비밀가리기(까닭(e), 비밀들)}`);
    return 2;
  } finally {
    그만 = true;
    process.off('SIGTERM', 끊음);
    process.off('SIGINT', 끊음);
  }
  const 줄 = 요약(본.표본들, 본.칸, a.곁);
  const 이름 = 것 === null ? '지켜보기' : `지켜보기-${것.이름}`;
  const 기록 = 기록남기기(자료, 이름, 것?.넘길 ?? [], { ...r, 값: { 지켜본것: 줄, ...(r.값 === undefined ? {} : { 함수값: r.값 }) } }, 비밀들);
  console.log(비밀가리기([
    `[지켜보기] ${본.표본들.length}번 봄 · ${(r.걸린ms / 1000).toFixed(1)}초${기록 === null ? '' : ` · 기록 ${기록}.json${r.화면 === undefined ? '' : ' · 끝 화면 .jpg'}`}`,
    ...덧줄(r, 기록),
    ...(r.오류 === undefined ? [] : [`함수 오류: ${r.오류}`]),
    ...줄.map((x) => x.slice(0, 900)),
    ...(Object.keys(본.뺀것).length === 0 ? [] : [`다른 복제본 안에 들어 있어 뺀 것(--nested 로 본다): ${Object.entries(본.뺀것).map(([이름, 수]) => `${이름}×${수}`).slice(0, 20).join(' · ')}`]),
    ...(본.못본.size === 0 ? [] : [`못 읽은 것: ${[...본.못본].slice(0, 8).join(' · ')}`]),
  ].join('\n'), 비밀들));
  if (것 !== null && r.오류 === undefined) console.log(결과글(r.값, 비밀들));
  if (자료 !== undefined) {
    const 알림 = 정리알림(자료);
    if (알림.length > 0) console.log(알림.join('\n'));
  }
  return r.오류 === undefined ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await 실행(process.argv.slice(2)));
}
