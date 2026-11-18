// 웹 케이스 · Page Object 가 공용 부품 밖에서 CSS · XPath 로 요소를 찾는지 세고 막는다(K17) — 작성 품질 숫자와 한 기준을 쓴다

import type ts from 'typescript';

import type { Violation } from './rules.js';

export const K17_WHY = '화면 구조가 조금만 바뀌어도 깨진다. 역할 · 라벨 · test id 로 찾는다';

// testid(`[data-testid=…]`)는 locator 1순위라 뺀다
// ponytail: `locator('div.x')` 처럼 태그 이름으로 시작하는 CSS 는 못 센다. 그 꼴이 쌓이면 시작 글자 목록을 넓힌다
export const CSS찾기 = /locator\(\s*['"`](?:[.#]|\[(?!data-testid)|\/\/|xpath=|css=)/g;

/** components · helpers 폴더 안은 공용 부품이라 세지 않는다 */
export const 공용부품인가 = (경로: string): boolean => 경로.split('/').some((m) => m === 'components' || m === 'helpers');

export function k17(file: string, sf: ts.SourceFile): Violation[] {
  if (공용부품인가(file)) return [];
  const 자리들 = [...sf.text.matchAll(CSS찾기)];
  const 허용 = 기존개수[file] ?? 0;
  if (자리들.length <= 허용) return [];
  // 어느 것이 새로 생겼는지는 모르니 다 짚는다 — 기존 개수를 넘긴 파일은 그 가운데 하나만 고쳐도 된다
  const 꼬리 = 허용 === 0 ? '' : ` (이 파일은 기존 ${허용}개까지 봐 준다 — 지금 ${자리들.length}개)`;
  return 자리들.map((m) => ({
    file,
    line: sf.getLineAndCharacterOfPosition(m.index).line + 1,
    rule: 'K17' as const,
    what: `공용 부품 밖에서 CSS · XPath 로 찾는다${꼬리}`,
    why: K17_WHY,
  }));
}

// K17 을 켠 2026-11-18 main 에 이미 있던 개수(AUT-F4-08). 화면을 다시 읽어야 고칠 수 있어 그때까지 봐 준다 — 늘면 막고, 고쳐서 줄면 여기 숫자도 줄인다.
// 열쇠는 tests 폴더 기준 경로다(`check:tests` 가 넘기는 꼴)
const 기존개수: Readonly<Record<string, number>> = {
  'aro/pages/dashboard.page.ts': 3,
  'aro/pages/grants.page.ts': 8,
  'aro/pages/login.page.ts': 3,
  'aro/pages/logs.page.ts': 1,
  'aro/pages/maintenance.page.ts': 3,
  'aro/pages/notices.page.ts': 1,
  'aro/pages/users.page.ts': 6,
  'aso/pages/backoffice.page.ts': 31,
  'demo/pages/todo.page.ts': 2,
  'dmo/pages/fixtures.page.ts': 1,
  'dmo/pages/inquiries.page.ts': 1,
  'dmo/pages/login.page.ts': 1,
  'dmo/pages/my-orders.page.ts': 5,
  'dmo/pages/ops-board.page.ts': 1,
  'dmo/pages/users.page.ts': 1,
  'dmw/DMW-UI-105.spec.ts': 3,
  'dmw/pages/board-detail.page.ts': 4,
  'dmw/pages/board-list.page.ts': 1,
  'dmw/pages/cart.page.ts': 5,
  'dmw/pages/checkout-done.page.ts': 2,
  'dmw/pages/checkout.page.ts': 2,
  'dmw/pages/home.page.ts': 6,
  'dmw/pages/my-order-detail.page.ts': 1,
  'dmw/pages/my-profile.page.ts': 1,
  'dmw/pages/shop-list.page.ts': 8,
  'dmw/pages/signup.page.ts': 1,
  'mkf/pages/admin.page.ts': 2,
  'mkf/pages/board-detail.page.ts': 4,
  'mkf/pages/board-list.page.ts': 2,
  'mkf/pages/cart.page.ts': 3,
  'mkf/pages/home.page.ts': 3,
  'mkf/pages/my-order-detail.page.ts': 1,
  'mkf/pages/my-profile.page.ts': 5,
  'mkf/pages/shop-detail.page.ts': 2,
  'mkf/pages/shop-list.page.ts': 5,
  'mkf/pages/support.page.ts': 1,
  'mks/pages/shop-detail.page.ts': 1,
  'mks/pages/shop-list.page.ts': 2,
  'mku/pages/admin.page.ts': 2,
  'mku/pages/board-detail.page.ts': 4,
  'mku/pages/board-list.page.ts': 2,
  'mku/pages/cart.page.ts': 3,
  'mku/pages/home.page.ts': 3,
  'mku/pages/my-order-detail.page.ts': 1,
  'mku/pages/my-profile.page.ts': 4,
  'mku/pages/shop-detail.page.ts': 2,
  'mku/pages/shop-list.page.ts': 5,
  'mku/pages/support.page.ts': 1,
  'mto/pages/account-action.page.ts': 1,
  'mto/pages/account-detail.page.ts': 8,
  'mto/pages/account-list.page.ts': 9,
  'mto/pages/account-statuses.page.ts': 1,
  'mto/pages/action-logs.page.ts': 3,
  'mto/pages/announcements.page.ts': 2,
  'mto/pages/custom-emojis.page.ts': 1,
  'mto/pages/dashboard.page.ts': 3,
  'mto/pages/domain-block-import.page.ts': 1,
  'mto/pages/email-domain-blocks.page.ts': 1,
  'mto/pages/ip-blocks.page.ts': 1,
  'mto/pages/report-detail.page.ts': 6,
  'mto/pages/report-list.page.ts': 6,
  'mto/pages/role-form.page.ts': 1,
  'mto/pages/roles.page.ts': 4,
  'mto/pages/rules.page.ts': 6,
  'mto/pages/settings.page.ts': 3,
  'mto/pages/sign-up.page.ts': 1,
  'mto/pages/tag-detail.page.ts': 1,
  'mto/pages/tags.page.ts': 2,
  'mto/pages/terms-draft.page.ts': 2,
  'mto/pages/trends-statuses.page.ts': 1,
  'mto/pages/username-blocks.page.ts': 1,
  'mto/pages/warning-presets.page.ts': 2,
  'mto/pages/webhook-form.page.ts': 1,
  'mto/pages/webhooks.page.ts': 1,
  'mtw/pages/about.page.ts': 5,
  'mtw/pages/admin-email-domain-blocks.page.ts': 1,
  'mtw/pages/auth-settings.page.ts': 1,
  'mtw/pages/confirmation.page.ts': 1,
  'mtw/pages/feed-card.page.ts': 3,
  'mtw/pages/filters.page.ts': 2,
  'mtw/pages/home.page.ts': 1,
  'mtw/pages/password-reset.page.ts': 1,
  'mtw/pages/profile.page.ts': 1,
  'mtw/pages/sign-in.page.ts': 1,
  'mtw/pages/sign-up.page.ts': 2,
};
