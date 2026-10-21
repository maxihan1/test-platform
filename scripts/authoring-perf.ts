// 작성 에이전트가 성능 AI 일을 한 자리에서 하나씩 집어 claude 로 돌리고 결과를 돌려주는 고리 (SPEC 도메인/성능 §7 「AI 일」)

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { 자식환경 } from './authoring-chain.js';
import { 돌린다, 멈춤, 부른다, 쉬기 } from './authoring-io.js';
import { 모델설정, 모델인자 } from './authoring-model.js';
import { 답에서JSON, 성능프롬프트 } from './authoring-perf-prompt.js';

export { 답에서JSON, 성능프롬프트 };

// 도구 · MCP · 스킬을 하나도 안 준다 — 재료(녹화 응답 · 올린 파일)는 남이 쓴 글이라 그 안의 지시를 따를 손을 남기지 않는다.
// 막을 목록이 아니라 빈 허용 목록이다 — 막을 목록은 새 도구 이름이 생기면 뚫린다
const 도구없음 = ['--tools', '', '--strict-mcp-config', '--disable-slash-commands'];
const 제한 = 15 * 60_000;

export interface 성능손 {
  부른다: typeof 부른다;
  돌린다: typeof 돌린다;
  쉬기: (ms: number) => Promise<unknown>;
}
const 기본손: 성능손 = { 부른다, 돌린다, 쉬기 };

export interface 성능일 {
  id: number;
  kind: string;
  input: unknown;
}

type 끝몸 = { output: Record<string, unknown> } | { error: string };

/** 일 하나를 돌려 서버에 보낼 몸을 만든다. 실패는 던지지 않고 error 로 낸다 — 서버가 그 일을 FAILED 로 닫는다 */
export async function 성능일하기(일: 성능일, 손: 성능손 = 기본손, 신호?: AbortSignal): Promise<끝몸> {
  const 프롬프트 = 성능프롬프트(일.kind, 일.input);
  if (프롬프트 === null) return { error: `이 에이전트가 모르는 일: ${일.kind}` };
  const 모델 = 모델설정(process.env);
  if ('까닭' in 모델) return { error: 모델.까닭 };
  // 도구를 막아도 cwd 는 비워 둔다 — 저장소 파일이 프롬프트에 섞이지 않게
  const 폴더 = mkdtempSync(join(tmpdir(), 'authoring-perf-'));
  try {
    const 답 = await 손.돌린다('claude', ['-p', ...모델인자(모델), '--output-format', 'text', ...도구없음], {
      cwd: 폴더,
      env: 자식환경(process.env, 폴더),
      input: 프롬프트,
      제한,
      신호,
    });
    if (답.멈춤으로죽음) return { error: '멈춤 신호로 끊겼다' };
    if (답.시간초과) return { error: 'claude 가 15분 안에 끝내지 못했다' };
    if (답.코드 !== 0) return { error: `claude 가 ${답.코드 ?? '못 띄움'} 로 끝났다: ${답.오류.slice(0, 200)}` };
    const 몸 = 답에서JSON(답.낸것);
    return 몸 === null ? { error: '답에서 JSON 객체를 읽지 못했다' } : { output: 몸 };
  } finally {
    rmSync(폴더, { recursive: true, force: true });
  }
}

/**
 * 일이 없으면 5초 쉬고, 있으면 그 일 하나를 끝까지 돌린 뒤 다시 집는다. 작성 요청의 동시 상한과 상관없는 한 자리다.
 * 거절(401·403)은 작성 고리와 같이 멈춤 까닭에 적고 끝낸다 — 기다려도 안 풀린다
 */
export async function 성능일돌기(주소: string, 토큰: string, 신호?: AbortSignal, 손: 성능손 = 기본손): Promise<void> {
  while (신호?.aborted !== true && 멈춤.까닭 === null) {
    try {
      const 답 = await 손.부른다(주소, 토큰, '/perf/ai-jobs/claim', { method: 'POST' });
      const 일 = (답.몸 as { job?: 성능일 | null } | null)?.job;
      if (일 != null) {
        console.log(`[성능] ${일.id}번을 집었다 (${일.kind}).`);
        const 끝 = await 손.부른다(주소, 토큰, `/perf/ai-jobs/${일.id}/finish`, { method: 'POST', body: await 성능일하기(일, 손, 신호) });
        // 모양이 틀리면 서버가 그 일을 FAILED 로 두고 400 을 준다. 로그만 남기고 넘어간다
        if (끝.status !== 204) console.error(`[성능] ${일.id}번 끝내기가 ${끝.status} 를 냈다.`);
        continue;
      }
    } catch (err) {
      const 글 = err instanceof Error ? err.message : String(err);
      // 거절은 이 고리만 끝낸다 — 성능 일 하나 때문에 몇 시간짜리 작성 자식들을 죽이지 않는다
      if (글.includes('서버가 거절했다')) {
        console.error(`[성능] 서버가 성능 AI 일을 거절해 이 고리를 끝낸다: ${글}`);
        return;
      }
      console.error(`[기다림] 성능 일: ${글}`);
    }
    await 손.쉬기(5000);
  }
}
