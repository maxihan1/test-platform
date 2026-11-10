// 작성 서버의 Scout 챗봇 자리 — 1초마다 질문을 가져가 claude 로 답하고 진행 줄 · 답 조각을 흘려 보낸 뒤 끝과 토큰을 알린다 (도메인/챗봇 §3.14 「돌리는 곳」 · §7)

import { chmodSync, chownSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { 결제환경 } from './authoring-billing.js';
import { 자식환경 } from './authoring-chain.js';
import { 챗봇인자, 챗봇제한, 챗봇지시문, 끝몸만들기, 질문풀기, 조각나누기, 조각뽑기, 조각합치기, 턴넘쳤나, type 챗봇질문, type 조각, 챗봇모델 } from './authoring-chat-prompt.js';
import type { 계정 } from './authoring-copy.js';
import { MCP설정쓰기, 자식거두기 } from './authoring-child.js';
import { 돌린다, 멈춤, 부른다, 쉬기 } from './authoring-io.js';
import { 한도걸렸나 } from './authoring-model.js';
import { MCP설정글 } from './authoring-rules.js';
import { 흐름풀기 } from './authoring-usage.js';

export interface 챗봇손 {
  부른다: typeof 부른다;
  돌린다: typeof 돌린다;
  쉬기: (ms: number) => Promise<unknown>;
  거두기: typeof 자식거두기;
}
const 기본손: 챗봇손 = { 부른다, 돌린다, 쉬기, 거두기: 자식거두기 };

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
  const 뿌리 = mkdtempSync(join(tmpdir(), 'scout-'));
  // 뿌리는 root 것이라 자리 uid 가 지나갈 수만 있게 연다. 안의 셋은 그 uid 의 0700 이라 다른 자리는 못 연다
  chmodSync(뿌리, 0o711);
  const 자리 = { 뿌리, 일: join(뿌리, '일'), 집: join(뿌리, '집'), 임시: join(뿌리, '임시') };
  for (const 폴더 of [자리.일, 자리.집, 자리.임시]) mkdirSync(폴더, { mode: 0o700 });
  if (자식 !== null) for (const 폴더 of [자리.일, 자리.집, 자리.임시]) chownSync(폴더, 자식.uid, 자식.gid);
  return 자리;
}

/** 질문 하나를 끝까지 — 자식을 띄워 조각을 흘려 보내고, 2분 · 중단 · 거절이면 끄고, 끝과 토큰을 알린다 */
export async function 질문답하기(주소: string, 토큰: string, q: 챗봇질문, 자식: 계정 | null, 가져간때: number, 손: 챗봇손 = 기본손): Promise<void> {
  const 끄기 = new AbortController();
  let 거절 = false;
  const 흘림 = 흘리개(
    async (조각들) => {
      try {
        const 답 = await 손.부른다(주소, 토큰, `/chat/agent/questions/${String(q.id)}/chunks`, { method: 'POST', body: { chunks: 조각들 } });
        if (답.status === 409) return 'stopped';
        if (답.status !== 204) console.error(`[Scout] ${String(q.id)}번 조각을 서버가 안 받았다 (${String(답.status)})`);
        return 'ok';
      } catch (err) {
        // 거절이면 기다려도 안 풀린다 — 자식을 끄고 이 자리 고리를 끝낸다
        if (거절인가(err)) {
          거절 = true;
          return 'stopped';
        }
        console.error(`[Scout] ${String(q.id)}번 조각을 못 보냈다: ${err instanceof Error ? err.message : String(err)}`);
        return 'ok';
      }
    },
    () => 끄기.abort(),
  );
  const 뽑개 = 조각뽑기();
  const 자리 = 폴더만들기(자식);
  try {
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
    if (!(await 손.거두기(자식)) || 멈춤.까닭 !== null) return;
    if (거절) throw new Error('서버가 거절했다 — 조각 보내기');
    const 흐름 = 흐름풀기(돌린것.낸것);
    const 몸 = 끝몸만들기({
      코드: 돌린것.코드,
      시간초과: 돌린것.시간초과,
      멈췄나: 흘림.멈췄나(),
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
    const 끝 = await 손.부른다(주소, 토큰, `/chat/agent/questions/${String(q.id)}/finish`, { method: 'POST', body: 몸 });
    if (끝.status !== 204) console.error(`[Scout] ${String(q.id)}번 끝 알리기가 ${String(끝.status)} 를 냈다`);
    const u = 몸.usage;
    console.log(`[Scout] ${String(q.id)}번 ${몸.status}${흘림.멈췄나() ? '(중단)' : ''} · 도구 ${String(u.toolCalls)}번 · 토큰 입력 ${String(u.tokensInput)} · 출력 ${String(u.tokensOutput)} · 캐시 ${String(u.tokensCacheRead + u.tokensCacheWrite)}`);
  } finally {
    rmSync(자리.뿌리, { recursive: true, force: true });
  }
}

/**
 * 챗봇 자리 하나의 고리. 질문이 없으면 1초 쉬고(사람이 화면 앞에서 기다린다 — 결정 7), 있으면 끝까지 답한 뒤 바로 다시 가져간다.
 * 작성 · 성능 AI 자리와 따로 돈다. 거절(401 · 403)은 이 고리만 끝낸다 — 질문 하나 때문에 몇 시간짜리 작성 자식들을 죽이지 않는다
 */
export async function 챗봇자리돌기(주소: string, 토큰: string, 번호: number, 자식: 계정 | null, 손: 챗봇손 = 기본손): Promise<void> {
  while (멈춤.까닭 === null) {
    try {
      const 답 = await 손.부른다(주소, 토큰, '/chat/agent/claim', { method: 'POST' });
      const 가져간때 = Date.now();
      const q = 답.status === 200 ? 질문풀기(답.몸) : null;
      if (q !== null) {
        // 질문 글은 로그에 남기지 않는다 — 묻는 사람의 글이고 작성 서버 로그는 여럿이 본다
        console.log(`[Scout] ${String(q.id)}번을 가져갔다 (프로젝트 ${String(q.projectId)} · 자리 ${String(번호)})`);
        await 질문답하기(주소, 토큰, q, 자식, 가져간때, 손);
        continue;
      }
      if (답.status !== 200) console.error(`[기다림] Scout 가져가기가 ${String(답.status)} 를 냈다`);
      else if ((답.몸 as { question?: unknown } | null)?.question != null) console.error('[Scout] 가져간 질문의 모양이 틀려 건너뛴다');
    } catch (err) {
      if (거절인가(err)) {
        console.error(`[Scout] 서버가 챗봇 질문을 거절해 자리 ${String(번호)} 고리를 끝낸다: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      console.error(`[기다림] Scout 자리 ${String(번호)}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await 손.쉬기(1000);
  }
}
