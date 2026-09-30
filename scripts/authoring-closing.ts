// 켤 때 멈춘 줄 닫기 — 에이전트가 꺼지며 끊긴 RUNNING 을 닫는다. 판단은 authoring-chain 의 `닫을RUNNING` 에 있다
// authoring-run.ts 가 300줄에 닿아 뗐다 (2026-09-30)

import { 닫을RUNNING } from './authoring-chain.js';
import { 보고손만들기, 부른다 } from './authoring-io.js';

/** 켤 때 내 이름으로 잡힌 채 멈춘 RUNNING 을 닫는다. 에이전트가 꺼져 끊긴 것이라 아무도 안 끝낸다 */
export async function 멈춘것닫기(주소기지: string, 토큰: string, 서비스들: string[], 나: string): Promise<void> {
  for (const 서비스 of 서비스들) {
    const 답 = await 부른다(주소기지, 토큰, `/authoring/requests?service=${encodeURIComponent(서비스)}&status=RUNNING`);
    if (답.status !== 200) {
      console.error(`[기다림] ${서비스} 의 RUNNING 목록을 못 읽었다 (${답.status}). 이번엔 건너뛴다.`);
      continue;
    }
    const 목록 = (답.몸 as { items?: Parameters<typeof 닫을RUNNING>[0] }).items ?? [];
    for (const { id, 몸 } of 닫을RUNNING(목록, 나)) {
      await 보고손만들기(주소기지, 토큰, 서비스, id).끝내기(몸);
      console.log(`[정리] ${서비스} 의 ${id}번은 에이전트가 꺼져 멈춘 채였다. ${String(몸.status)} 로 닫았다.`);
    }
  }
}
