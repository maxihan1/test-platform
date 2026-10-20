// 앱 첫 화면을 자료 폴더에 받아 둔다 — AI 가 러너에 닿지 않고 요소 주소를 고르게 (도메인/작성 §3.6 「앱 화면」 · §7 「앱 화면 통로」)
// 기대값의 근거가 아니다 — 자식 지침(tpx-author references/app.md)이 그렇게 읽는다

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 인증헤더 } from './authoring-io.js';
import { 비밀번호꼴가리기 } from './authoring-prd.js';

export type 앱화면 = { 글: string } | { 못읽음: string };

export const 앱화면파일 = (자료: string): string => join(자료, 'app-screen.txt');

/**
 * 자식을 띄우기 전에 부른다. 앱이 없는 서비스(경로가 없음)는 undefined — 프롬프트에 아무 절도 안 더한다.
 * 서버가 읽지 못한 까닭을 말했으면 그대로 돌려줘 자식이 화면을 짐작하지 않게 한다. 어느 경우도 작성은 간다.
 * 러너가 앱을 띄우는 일이라 다시 걸지 않는다 — 한 번 더 걸면 앱이 두 번 켜진다
 */
export async function 앱화면받기(서버: { 주소기지: string; 토큰: string }, 번호: number, 자료: string): Promise<앱화면 | undefined> {
  // 이어받은 자료 폴더에는 앞 실행이 받은 화면이 남아 있다. 이번에 못 읽었는데 옛 화면이 보이면 안 된다
  rmSync(앱화면파일(자료), { force: true });
  try {
    const 답 = await fetch(`${서버.주소기지}/api/authoring/requests/${String(번호)}/app-screen`, {
      headers: 인증헤더(서버.토큰),
      signal: AbortSignal.timeout(180_000),
    });
    const 몸 = (await 답.json().catch(() => null)) as { screen?: unknown; reason?: unknown } | null;
    if (!답.ok) return 로그만(번호, `서버 ${답.status}`);
    if (typeof 몸?.screen === 'string') {
      // 로그인 직전 화면이라 계정 값은 없다. 그래도 「비밀번호: 값」 꼴은 가린다 — 서비스 가이드와 같은 손
      writeFileSync(앱화면파일(자료), 비밀번호꼴가리기(몸.screen), { mode: 0o644 });
      return { 글: 앱화면파일(자료) };
    }
    if (몸?.screen === null && 몸.reason === null) return undefined;
    if (typeof 몸?.reason !== 'string') return 로그만(번호, '응답 모양이 틀리다');
    console.error(`[작성] ${번호}번 — 앱 화면을 못 읽었다(작성은 간다): ${몸.reason}`);
    return { 못읽음: 몸.reason };
  } catch (err) {
    return 로그만(번호, err instanceof Error ? err.name : '알 수 없는 오류');
  }
}

// 서버가 말한 까닭이 아닌 실패(옛 서버 · 끊김)는 앱이 있는지도 모른다 — 프롬프트를 안 바꾼다. 앱 없는 서비스가 달라지면 안 된다
function 로그만(번호: number, 까닭: string): undefined {
  console.error(`[작성] ${번호}번 — 앱 화면 통로를 못 불렀다(작성은 간다): ${까닭}`);
  return undefined;
}
