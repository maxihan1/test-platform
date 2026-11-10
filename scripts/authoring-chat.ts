// 작성 서버의 Scout 챗봇 자리 — 1초마다 질문을 가져가 claude 로 답하고 진행 줄 · 답 조각을 흘려 보낸 뒤 끝과 토큰을 알린다 (도메인/챗봇 §3.14 「돌리는 곳」 · §7)

import { chmodSync, chownSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { 결제환경 } from './authoring-billing.js';
import { 자식환경 } from './authoring-chain.js';
import { 챗봇인자, 챗봇제한, 챗봇지시문, 끝몸만들기, 질문풀기, 조각나누기, 조각뽑기, 조각합치기, 턴넘쳤나, type 챗봇질문, type 조각, type 끝몸, 챗봇모델 } from './authoring-chat-prompt.js';
import type { 계정 } from './authoring-copy.js';
import { MCP설정쓰기 } from './authoring-child.js';
import { 돌린다, 멈춤, 부른다, 쉬기, 친다 } from './authoring-io.js';
import { 한도걸렸나 } from './authoring-model.js';
import { MCP설정글 } from './authoring-rules.js';
import { 흐름풀기 } from './authoring-usage.js';

export interface 챗봇손 {
  부른다: typeof 부른다;
  돌린다: typeof 돌린다;
  쉬기: (ms: number) => Promise<unknown>;
  거두기: (자식: 계정 | null) => Promise<boolean>;
}
const 기본손: 챗봇손 = { 부른다, 돌린다, 쉬기, 거두기: (자식) => 챗봇거두기(자식) };

const 거절인가 = (err: unknown) => err instanceof Error && err.message.includes('서버가 거절했다');

/**
 * 답 조각을 0.3초쯤 모아 보내는 손. 진행 줄(STEP · STEP_DONE)은 기다리지 않고 앞에 모인 글과 함께 바로 보낸다.
 * 보내기는 하나씩 차례로 — 번호는 admin 이 받은 차례대로 붙인다. 409(STOPPED)를 받으면 더 보내지 않고 `멈추기` 를 부른다
 */
export function 흘리개(보내기: (조각들: 조각[]) => Promise<'ok' | 'stopped'>, 멈추기: () => void, 묶는시간 = 300) {
  let 모인: 조각[] = [];
  let 시계: ReturnType<typeof setTimeout> | null = null;
  let 앞: Promise<void> = Promise.resolve();
  let 멈췄다 = false;
  const 비우기 = (): Promise<void> => {
    if (시계 !== null) clearTimeout(시계);
    시계 = null;
    const 보낼것 = 조각합치기(모인);
    모인 = [];
    if (보낼것.length === 0) return 앞;
    앞 = 앞.then(async () => {
      for (const 한번 of 조각나누기(보낼것)) {
        if (멈췄다) return;
        if ((await 보내기(한번)) === 'stopped') {
          멈췄다 = true;
          멈추기();
        }
      }
    });
    return 앞;
  };
  return {
    넣기(조각들: 조각[]): void {
      if (멈췄다 || 조각들.length === 0) return;
      모인.push(...조각들);
      if (조각들.some((c) => c.kind !== 'TEXT')) void 비우기();
      else 시계 ??= setTimeout(() => void 비우기(), 묶는시간);
    },
    끝: 비우기,
    멈췄나: () => 멈췄다,
  };
}

/** 질문 하나의 빈 작업 폴더 — cwd(일) · 집 · 임시(MCP 설정)를 자리 uid 만 여는 0700 으로 */
function 폴더만들기(자식: 계정 | null) {
  // 작성 자식과 같은 바탕(/work, 755) 아래에 둔다 — 컨테이너의 root TMPDIR 는 700 집 안이라 자리 uid 가 못 들어가 claude 가 바로 죽는다 (SCOUT-F1-07 실측)
  const 뿌리 = mkdtempSync(join(process.env.AUTHORING_WORK_DIR || tmpdir(), 'scout-'));
  // 뿌리는 root 것이라 자리 uid 가 지나갈 수만 있게 연다. 안의 셋은 그 uid 의 0700 이라 다른 자리는 못 연다
  chmodSync(뿌리, 0o711);
  const 자리 = { 뿌리, 일: join(뿌리, '일'), 집: join(뿌리, '집'), 임시: join(뿌리, '임시') };
  for (const 폴더 of [자리.일, 자리.집, 자리.임시]) mkdirSync(폴더, { mode: 0o700 });
  if (자식 !== null) for (const 폴더 of [자리.일, 자리.집, 자리.임시]) chownSync(폴더, 자식.uid, 자식.gid);
  return 자리;
}

/** 지금 답을 쓰고 있는 질문 수 — CLI 자동 최신화가 도는 Scout 자식 아래에서 판을 바꾸지 않게 센다 */
let 도는질문 = 0;
export const 도는질문수 = () => 도는질문;

/** 조각 보내기를 몇 번까지 다시 거나 — admin 이 다시 뜨는 몇 초를 넘긴다. 끝내 못 보내면 빠진 글을 「완료」로 두지 않고 FAILED 로 끝낸다 */
const 조각재시도 = 3;

/**
 * 챗봇 자리 uid 의 남은 프로세스를 끄고 다 죽었는지 본다. 작성 자식의 `자식거두기` 와 달리 공용 임시를 훑지 않는다 —
 * 챗봇 자식은 도구가 MCP 뿐이라 파일을 못 쓰고, claude 가 쓰는 집 · 임시는 질문 폴더 안이라 통째로 지운다.
 * 그 훑기(spawnSync find)는 질문마다 돌면 에이전트 전체를 몇 초씩 세운다. 못 거뒀으면 false — 부르는 쪽이 그 자리만 닫는다
 */
export async function 챗봇거두기(자식: 계정 | null): Promise<boolean> {
  if (자식 === null) return true;
  for (let 시도 = 0; 시도 < 10; 시도 += 1) {
    친다('kill', ['-9', '-1'], '/', undefined, 10_000, { uid: 자식.uid, gid: 자식.gid, env: { PATH: '/usr/bin:/bin' } });
    // 「없음」은 pgrep 이 1 을 낼 때만이다 — 못 띄웠거나 시간이 넘은 것을 없음으로 읽지 않는다
    if (친다('pgrep', ['-u', String(자식.uid)], '/', undefined, 10_000).코드 === 1) return true;
    await 쉬기(200);
  }
  return false;
}

/** 질문 하나를 끝까지 — 자식을 띄워 조각을 흘려 보내고, 2분 · 중단 · 거절이면 끄고, 끝과 토큰을 알린다. 거둘 수 없으면 false(그 자리를 닫는다) */
export async function 질문답하기(주소: string, 토큰: string, q: 챗봇질문, 자식: 계정 | null, 가져간때: number, 손: 챗봇손 = 기본손): Promise<boolean> {
  const 끄기 = new AbortController();
  let 거절 = false;
  let 잃음 = false;
  let 끝보냄 = false;
  const 흘림 = 흘리개(
    async (조각들) => {
      for (let 시도 = 1; ; 시도 += 1) {
        let 까닭: string;
        try {
          const 답 = await 손.부른다(주소, 토큰, `/chat/agent/questions/${String(q.id)}/chunks`, { method: 'POST', body: { chunks: 조각들 } });
          if (답.status === 204) return 'ok';
          if (답.status === 409) return 'stopped';
          까닭 = `${String(답.status)} 를 냈다`;
          // 400 은 몸이 틀린 것이라 다시 걸어도 같다
          if (답.status === 400) 시도 = 조각재시도;
        } catch (err) {
          // 거절이면 기다려도 안 풀린다 — 자식을 끄고 이 자리 고리를 끝낸다
          if (거절인가(err)) {
            거절 = true;
            return 'stopped';
          }
          까닭 = err instanceof Error ? err.message : String(err);
        }
        if (시도 >= 조각재시도) {
          console.error(`[Scout] ${String(q.id)}번 조각을 못 보내 답을 멈춘다: ${까닭}`);
          잃음 = true;
          return 'stopped';
        }
        await 손.쉬기(1000);
      }
    },
    () => 끄기.abort(),
  );
  const 뽑개 = 조각뽑기();
  const 끝알리기 = async (몸: 끝몸) => {
    끝보냄 = true;
    const 끝 = await 손.부른다(주소, 토큰, `/chat/agent/questions/${String(q.id)}/finish`, { method: 'POST', body: 몸 });
    if (끝.status !== 204) console.error(`[Scout] ${String(q.id)}번 끝 알리기가 ${String(끝.status)} 를 냈다`);
  };
  let 자리: ReturnType<typeof 폴더만들기> | null = null;
  도는질문 += 1;
  try {
    자리 = 폴더만들기(자식);
    const 설정파일 = MCP설정쓰기(자리.임시, MCP설정글(주소, q.mcpKey), 자식)!;
    const 인자 = 챗봇인자(설정파일);
    const 환경 = 결제환경({ ...자식환경(process.env, 자리.임시), ...(자식 === null ? {} : { HOME: 자리.집, TMPDIR: 자리.임시 }) }, undefined);
    const 돌린것 = await 손.돌린다(자식 === null ? 'claude' : 'sh', 자식 === null ? 인자 : ['-c', 'umask 077 && exec claude "$@"', 'sh', ...인자], {
      cwd: 자리.일,
      input: 챗봇지시문(q),
      env: 환경,
      uid: 자식?.uid,
      gid: 자식?.gid,
      제한: Math.max(1, 챗봇제한 - (Date.now() - 가져간때)),
      신호: 끄기.signal,
      흘림줄: (줄) => {
        흘림.넣기(뽑개.뽑기(줄));
        return null;
      },
    });
    await 흘림.끝();
    // 자리 uid 의 남은 것을 거둔다 — 남으면 같은 자리를 받은 다음 질문의 MCP 설정(mcq_)을 읽는다
    if (!(await 손.거두기(자식))) {
      console.error(`[Scout] 자리 uid ${String(자식?.uid)} 의 프로세스를 못 거둬 이 자리를 닫는다 — 작성은 그대로 돈다`);
      await 끝알리기({ status: 'FAILED', error: '답을 쓴 프로세스를 거두지 못했다', usage: 빈사용량(가져간때) });
      return false;
    }
    if (멈춤.까닭 !== null) return true;
    if (거절) throw new Error('서버가 거절했다 — 조각 보내기');
    const 흐름 = 흐름풀기(돌린것.낸것);
    const 몸 = 끝몸만들기({
      코드: 돌린것.코드,
      시간초과: 돌린것.시간초과,
      멈췄나: 흘림.멈췄나() && !잃음,
      잃음,
      한도: 한도걸렸나(흐름.글, 돌린것.오류),
      턴넘침: 턴넘쳤나(돌린것.낸것),
      usage: {
        tokensInput: 흐름.사용량.input,
        tokensOutput: 흐름.사용량.output,
        tokensCacheRead: 흐름.사용량.cacheRead,
        tokensCacheWrite: 흐름.사용량.cacheWrite,
        model: (흐름.사용량.model ?? 챗봇모델).slice(0, 100),
        toolCalls: 뽑개.도구수(),
        durationMs: Date.now() - 가져간때,
      },
    });
    await 끝알리기(몸);
    const u = 몸.usage;
    console.log(`[Scout] ${String(q.id)}번 ${몸.status}${흘림.멈췄나() && !잃음 ? '(중단)' : ''} · 도구 ${String(u.toolCalls)}번 · 토큰 입력 ${String(u.tokensInput)} · 출력 ${String(u.tokensOutput)} · 캐시 ${String(u.tokensCacheRead + u.tokensCacheWrite)}`);
    return true;
  } catch (err) {
    if (거절인가(err) || 끝보냄) throw err;
    // 가져간 질문이 RUNNING 으로 150초 서 있지 않게 실패로 닫는다. 끝을 이미 보냈으면 다시 보내지 않는다 — 두 번째가 사용량을 0 으로 덮는다
    console.error(`[Scout] ${String(q.id)}번을 끝까지 못 돌려 실패로 닫는다: ${err instanceof Error ? err.message : String(err)}`);
    await 끝알리기({ status: 'FAILED', error: '작성 서버가 답을 만들다 멈췄다', usage: 빈사용량(가져간때) });
    return true;
  } finally {
    도는질문 -= 1;
    if (자리 !== null) rmSync(자리.뿌리, { recursive: true, force: true });
  }
}

const 빈사용량 = (가져간때: number) => ({ tokensInput: 0, tokensOutput: 0, tokensCacheRead: 0, tokensCacheWrite: 0, model: 챗봇모델, toolCalls: 0, durationMs: Date.now() - 가져간때 });

/**
 * 챗봇 자리 하나의 고리. 질문이 없으면 1초 쉬고(사람이 화면 앞에서 기다린다 — 결정 7), 있으면 끝까지 답한 뒤 바로 다시 가져간다.
 * 가져가기가 오류면 5초 쉰다 — admin 이 내려간 동안 자리마다 1초씩 로그를 쌓지 않게.
 * 작성 · 성능 AI 자리와 따로 돈다. 거절(401 · 403)과 거두지 못한 자리는 이 고리만 끝낸다 — 질문 하나 때문에 몇 시간짜리 작성 자식들을 죽이지 않는다
 */
export async function 챗봇자리돌기(주소: string, 토큰: string, 번호: number, 자식: 계정 | null, 손: 챗봇손 = 기본손): Promise<void> {
  while (멈춤.까닭 === null) {
    let 쉴때 = 1000;
    try {
      const 답 = await 손.부른다(주소, 토큰, '/chat/agent/claim', { method: 'POST' });
      const 가져간때 = Date.now();
      const q = 답.status === 200 ? 질문풀기(답.몸) : null;
      if (q !== null) {
        // 질문 글은 로그에 남기지 않는다 — 묻는 사람의 글이고 작성 서버 로그는 여럿이 본다
        console.log(`[Scout] ${String(q.id)}번을 가져갔다 (프로젝트 ${String(q.projectId)} · 자리 ${String(번호)})`);
        if (!(await 질문답하기(주소, 토큰, q, 자식, 가져간때, 손))) return;
        continue;
      }
      const 번호만 = (답.몸 as { question?: { id?: unknown } | null } | null)?.question?.id;
      if (답.status !== 200) {
        console.error(`[기다림] Scout 가져가기가 ${String(답.status)} 를 냈다`);
        쉴때 = 5000;
      } else if (Number.isInteger(번호만)) {
        // 서버는 이미 RUNNING 으로 바꿨다 — 번호를 알면 150초 기다리게 두지 않고 바로 실패로 닫는다
        console.error(`[Scout] ${String(번호만)}번 질문의 모양이 틀려 실패로 닫는다`);
        await 손.부른다(주소, 토큰, `/chat/agent/questions/${String(번호만)}/finish`, { method: 'POST', body: { status: 'FAILED', error: '질문 모양이 틀렸다', usage: 빈사용량(가져간때) } });
      }
    } catch (err) {
      if (거절인가(err)) {
        console.error(`[Scout] 서버가 챗봇 질문을 거절해 자리 ${String(번호)} 고리를 끝낸다: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      console.error(`[기다림] Scout 자리 ${String(번호)}: ${err instanceof Error ? err.message : String(err)}`);
      쉴때 = 5000;
    }
    await 손.쉬기(쉴때);
  }
}
