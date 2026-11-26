// 10판 확인 — 이기는 미션에 쓸 작전(조작 도우미 함수)을 원래 속도로 되풀이해 다 이기는지 본다. AI 없이 스크립트만 돈다 (도메인/게임 §3.10 「배운 것을 PRD · 테스트로」)
// 함수는 어디서 불려도 그 판의 시작 조건을 맞추고 한 판을 끝까지 한 뒤 { 이김: true | false } 를 돌려준다
// 쓰는 법: npx tsx scripts/authoring-game-wins.ts <테스트 폴더> <도우미 파일 이름> <함수> ['<인자 JSON 배열>'] [--max <한 판 초>] — 0 다 이김 · 1 졌다 · 2 부를 수 없음(판을 안 셈) · 3 남음(같은 명령을 다시)
import { pathToFileURL } from 'node:url';

import { gameLink } from '@platform/kit/game';
import type { Link } from 'control-cli';

import { 부를준비 } from './authoring-game-play-call.js';
import { 기록남기기 } from './authoring-game-play-log.js';
import { type 조작결과, 돌린다 } from './authoring-game-play.js';
import { type 판수, 다채웠나, 이긴판읽기, 이긴판적기, 채울판 } from './authoring-game-wins-log.js';
import { 지금지도 } from './authoring-game-find.js';
import { 나아감열쇠, 나아감자리 } from './authoring-learn-check.js';
import { 비밀가리기 } from './authoring-reverse.js';

const 머리 = '[10판]';
/** 한 번 부름 — 셸 명령의 최대 한도(10분) 안이다. 한 판의 한도에 게임에 붙고 거두는 시간을 더해 들어갈 때만 다음 판을 시작한다 */
const 부름ms = 9 * 60_000;
const 붙고거두기ms = 60_000;

export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link, 지금: () => number = Date.now): Promise<number> {
  const 것 = await 부를준비('authoring-game-wins', 머리, 인자, 트리, env);
  if (것 === null) return 2;
  const { 폴더, 파일, 이름, 넘길, 초, 비밀들, 자료 } = 것;
  if (것.화면초 !== undefined || 것.멈춤 || 것.계획 !== undefined) {
    console.error(`${머리} --shots · --freeze · --plan 은 못 쓴다 — 10판 확인은 원래 속도 · 같은 조건으로만 돈다`);
    return 2;
  }
  if (!자료) {
    console.error(`${머리} 자료 폴더를 모른다 — 작성 에이전트의 자식만 부른다`);
    return 2;
  }
  const 작전 = { 파일, 함수: 이름, 인자: 넘길 };
  let 판: 판수 = 이긴판읽기(자료, 트리, 폴더, 작전);
  const 끝말 = (): string => `${머리} ${이름} ${JSON.stringify(넘길)} — 이김 ${판.이김} / ${채울판}${판.짐 > 0 ? ` · 짐 ${판.짐}` : ''}`;
  if (판.짐 > 0) {
    // 졌던 작전을 이길 때까지 다시 돌리면 확인이 아니다
    console.log(`${끝말()} — 이 작전은 이미 졌다. 작전을 고치거나 시작 조건을 쉽게 맞춘 뒤(함수나 인자가 바뀌면 처음부터 센다) 다시 부른다`);
    return 1;
  }
  // 나아감이 정해진 게임은 판마다 출발점이 같아야 센다(2026-11-26 사용자 — 스테이지 없는 게임은 「같은 출발점에서 열 번 다 목표 숫자」)
  const 출발자리 = 나아감자리(지금지도(자료)?.줄들.find((x) => x.key === 나아감열쇠 && x.learned !== null)?.learned?.data) ?? undefined;
  const 끊기 = new AbortController();
  const 끊음 = (): void => 끊기.abort();
  process.once('SIGTERM', 끊음);
  process.once('SIGINT', 끊음);
  const 못셈 = (왜: string): number => {
    console.error(비밀가리기(`${머리} 이 판은 안 셈 — ${왜}. ${끝말()}`, 비밀들));
    return 2;
  };
  try {
    const 시작 = 지금();
    for (let 첫 = true; !다채웠나(판); 첫 = false) {
      if (!첫 && 지금() - 시작 + 초 * 1000 + 붙고거두기ms > 부름ms) {
        console.log(`${끝말()} — 남았다. 같은 명령을 다시 부른다(디바이스를 새로 잡았으면 함수가 그 자리까지 다시 간다)`);
        return 3;
      }
      let r: 조작결과;
      try {
        r = await 돌린다(길 ?? (await gameLink(것.환경)), 것.함수, 것.환경, 초 * 1000, 끊기.signal, { 자료, ...(출발자리 === undefined ? {} : { 출발: 출발자리 }) });
      } catch (e) {
        return 못셈(`게임에 못 붙었다(${e instanceof Error ? e.message : String(e)})`);
      }
      const 기록 = 기록남기기(자료, 이름, 넘길, r, 비밀들);
      // 「판이 안 흐른다」 같은 알림을 여기서도 보인다 — 안 보이면 멈춘 게임에서 진 판의 까닭이 묻힌다
      for (const 말 of r.알림말) console.log(비밀가리기(`${머리} ${말}`, 비밀들));
      if (r.멈춘채) return 못셈('멈춰 둔 게임을 못 풀었다 — 판이 안 흐른다');
      // 멈춘 화면(0배)에서 시작하는 것은 게임이 멈춘 것이다 — 그 밖의 배율은 원래 속도가 아니다
      if (r.배율바꿈 || (r.배율 !== null && r.배율 !== 0 && r.배율 !== 1)) return 못셈(`원래 속도가 아니다(${r.배율바꿈 ? '함수가 시간 배율을 바꿨다' : `배율 ${r.배율}`}) — \`npx control-cli -s=g timescale-set 1\` 뒤 다시 부른다`);
      // 작전 탓이 아닌 판 — 밖에서 끊음 · 입력을 못 놓음 · 명령의 답을 못 받고 못 이김(팜 거절 · 시간 초과). 답을 못 받고도 이긴 판은 이긴 것이다
      if (끊기.signal.aborted || r.입력못놓음) return 못셈(r.오류 ?? '밖에서 끊음');
      if (r.통신오류 !== null && (r.값 as { 이김?: unknown } | null | undefined)?.이김 !== true) return 못셈(`명령의 답을 못 받았다(${r.통신오류})`);
      const 이김 = r.오류 === undefined ? (r.값 as { 이김?: unknown } | null | undefined)?.이김 : false;
      if (typeof 이김 !== 'boolean') return 못셈('함수가 { 이김: true | false } 를 돌려주지 않았다');
      if (출발자리 !== undefined) {
        if (r.출발 === null || r.출발 === undefined) return 못셈('판을 시작할 때 나아감을 못 읽었다');
        if (판.출발 !== undefined && r.출발 !== 판.출발) return 못셈(`출발점이 다르다(첫 판 나아감 ${판.출발} · 이 판 ${r.출발}) — 함수가 시작 조건부터 같은 자리로 맞춰야 한다. 되돌릴 수 없는 게임이면 이 작전은 미션에 못 쓴다`);
        판 = { ...판, 출발: r.출발 };
      }
      판 = 이김 ? { ...판, 이김: 판.이김 + 1 } : { ...판, 짐: 판.짐 + 1 };
      이긴판적기(자료, 트리, 폴더, 작전, 판);
      console.log(비밀가리기(`${머리} ${판.이김 + 판.짐}판째 ${이김 ? '이김' : `짐${r.오류 === undefined ? '' : `(${r.오류})`}`} · ${(r.걸린ms / 1000).toFixed(1)}초${기록 === null ? '' : ` · 기록 ${기록}.json`}`, 비밀들));
      if (!이김) {
        console.log(`${끝말()} — 다 이긴 작전이 아니다. 시작 조건을 쉽게 맞춰도 안 되면 그 미션은 쓰지 않는다`);
        return 1;
      }
    }
    console.log(`${끝말()} — 다 이겼다`);
    return 0;
  } finally {
    process.off('SIGTERM', 끊음);
    process.off('SIGINT', 끊음);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 막힌 명령을 기다리는 함수가 남아 있을 수 있다 — 바로 끝낸다
  process.exit(await 실행(process.argv.slice(2)));
}
