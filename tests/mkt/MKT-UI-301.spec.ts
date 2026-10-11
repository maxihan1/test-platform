import { defineCase, test, verify } from '@platform/kit';

import { 상담창 } from './components/chat.component.js';
import { 세션사용자, 오른쪽아래에있는가 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-301',
  name: '홈 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상담 = new 상담창(page);
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await page.goto('/');
    await 상담.상담버튼.waitFor();
    await verify('홈 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다', [await 상담.상담버튼.isVisible(), await 상담.상담버튼.innerText(), await 오른쪽아래에있는가(page, 상담.상담버튼)], [true, '💬', true]);
  });

  await test.step('상품 목록을 연다', async () => {
    await 목록.열기();
    await 상담.상담버튼.waitFor();
    await verify('상품 목록 오른쪽 아래에도 말풍선 모양 상담 버튼이 보인다', [await 상담.상담버튼.isVisible(), await 상담.상담버튼.innerText(), await 오른쪽아래에있는가(page, 상담.상담버튼)], [true, '💬', true]);
  });
});
