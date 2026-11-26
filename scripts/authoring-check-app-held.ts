// 앱 보류 · 진행 불가 확인(장치 ②) — 케이스 목록의 「보류 — …」 줄과 목표표의 「진행 불가」가 그 세션에 폰에서 해 본 기록을 대는지 본다 (도메인/작성 §3.6 「★ 앱 배우기」 「막는 장치」 · APP-F5-04)
// 게임은 지침만 둔 동안 보류 25건이 다 해 보지 않은 규칙이었고, 앱은 진행 불가가 까닭 글만 있으면 지났다(2026-11-26 사용자 「지침이 새지 않도록 강제화」)
import type { 앱목표표 } from './authoring-app-explore.js';
import { 댄기록, 앱맞대기자리, 이번기록들, 환경까닭 } from './authoring-app-compare.js';
import { 백틱벗기기, 표읽기 } from './authoring-md-table.js';

/** 에이전트가 Android 앱 작성의 자식에게 주는 자료 폴더 — 빠른 검사가 해 본 기록을 본다 */
export const 앱자료환경 = 'AUTHORING_APP_DIR';

/** 진행 불가 하나가 대야 하는 기록 수 — 앱 탐색 차례 5 의 「목표마다 3번」 */
export const 진행불가기록수 = 3;

/**
 * 해 본 기록을 안 댄 앱 보류 줄. 기록은 케이스 시작 표시 뒤의 해 본 기록이어야 한다. 볼(이번에 바뀐 케이스의 tcId)을 주면
 * 그 밖의 줄은 「해 본 것」을 이미 적은 줄만 넘어간다 — 케이스 파일은 그대로 두고 목록 줄만 보류로 바꾼 것도 본다
 */
export function 앱안해본보류(표글: string, 자료: string, 볼?: ReadonlySet<string>): string[] {
  const 이번 = 이번기록들(자료, 앱맞대기자리.케이스시작);
  return 표읽기(표글, '요구사항').flatMap((줄) => {
    const tcId = 백틱벗기기(줄['tcId'] ?? '');
    const 까닭 = /보류 — (.+)$/.exec(줄['출처'] ?? '')?.[1];
    if (까닭 === undefined || 환경까닭.test(까닭) || (볼 !== undefined && !볼.has(tcId) && /해 본 것:/.test(까닭))) return [];
    if (댄기록(까닭, 이번).length > 0) return [];
    return [`요구 ${줄['요구'] ?? '?'}(${tcId}) — 「${까닭}」 보류에 이번 케이스 세션의 해 본 기록이 없다. 폰에서 해 본 기록 명령(scripts/authoring-app-try.ts)으로 해 본 뒤 「(해 본 것: <app-try 기록 이름>.json · 무엇을 몇 번)」을 붙이거나 보류를 풀고 케이스를 쓴다`];
  });
}

/** 진행 불가 목표 가운데 환경 까닭이 아니고 기획서 맞대기 시작 뒤의 해 본 기록을 셋 대지 않은 것 */
export function 안해본진행불가(표: 앱목표표, 이번: ReadonlySet<string>): string[] {
  return 표.목표.flatMap((g) => {
    if (g.결과 !== '진행 불가') return [];
    const 까닭 = g.까닭?.trim() ?? '';
    if (까닭 === '' || 환경까닭.test(까닭)) return [];
    const 댄 = 댄기록(까닭, 이번).length;
    return 댄 >= 진행불가기록수 ? [] : [`「${g.기능.slice(0, 40)}」 — 진행 불가 까닭에 이번 해 본 기록이 ${String(댄)}개다 — 해 본 기록 명령으로 세 번 해 보고 「해 본 것: <기록 이름> · <기록 이름> · <기록 이름>」을 붙인다(환경 까닭이면 그 머리로 시작한다)`];
  });
}
