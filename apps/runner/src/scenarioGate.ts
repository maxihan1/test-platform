// 러너 시나리오 입구가 앱 · 게임 단계에 더 보는 것 — 결정 16 표의 조립 400 과 폰 연결 값 (SPEC 도메인/시나리오 §3.7 결정 16)

import type { ScenarioExecuteRequest } from '@platform/kit';

type 부품 = ScenarioExecuteRequest['parts'][number];

// 앱 · 게임 단계에 못 거는 것 — 앱은 폰 안에서 자기 서버와 바로 주고받아 러너가 그 요청을 못 본다. 표의 정본은 SPEC 도메인/시나리오 §3.7 결정 16.
// admin 조립 검사도 막지만 러너가 마지막으로 막는다 — 걸린 줄 아는데 앱 요청은 진짜 서버로 가는 실행이 가장 나쁘다
export function 앱단계에못거는것(parts: readonly 부품[]): string | undefined {
  const 켜진모킹 = new Set<string>();
  for (const [i, part] of parts.entries()) {
    if (part.kind === 'mock') 켜진모킹.add(part.urlPattern);
    if (part.kind === 'unmock') 켜진모킹.delete(part.urlPattern);
    if (part.kind !== 'case' || part.appStep !== true) continue;
    const 번 = `${i + 1}번 앱 · 게임 단계`;
    if (켜진모킹.size > 0) return `${번}가 모킹 구간 안에 있다 — 모킹은 앱 단계 앞에서 끈다`;
    if (part.carryOver === false) return `${번}는 넘겨받기를 끌 수 없다 — 끄려면 앱을 다시 켜야 한다`;
    if (part.links?.some((link) => link.kind !== 'bind')) return `${번}에는 값 꽂기만 건다 — 앞 응답 돌려주기 · 요청 막기 · 바꿔 보내기는 앱 요청에 안 걸린다`;
  }
  return undefined;
}

// 앱 파일 · Appium 주소가 없으면 첫 앱 단계에서야 터진다 — 그 앞 웹 단계가 이미 대상 서버를 바꾼 뒤다. 돌기 전에 거절한다
export function 폰값이없다(req: Pick<ScenarioExecuteRequest, 'parts' | 'app'>, env: Record<string, string | undefined>): string | undefined {
  if (!req.parts.some((p) => p.kind === 'case' && p.appStep === true)) return undefined;
  if (!env.PLATFORM_APPIUM_URL) return '앱 · 게임 단계를 돌릴 Appium 주소(PLATFORM_APPIUM_URL)가 이 러너에 없다';
  if (req.app === undefined && !env.PLATFORM_APP) return '앱 · 게임 단계에 깔 앱 파일이 없다 — 요청의 app 이나 러너의 PLATFORM_APP 이 필요하다';
  return undefined;
}
