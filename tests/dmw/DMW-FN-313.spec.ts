import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-313',
  name: '지도 「확대」를 누르면 배율 숫자가 1 오른다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);

  await test.step('비회원으로 고객센터 화면을 연다', async () => {
    await 안내창막기(page);
    await 화면.열기();
    await verify('오시는 길 지도의 「확대」 버튼이 보인다', await 화면.확대.isVisible(), true, { blocker: true });
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('오시는 길 지도의 「확대」를 누른다', async () => {
    const 이전 = await 화면.배율숫자();
    await 화면.확대.click();
    await verify('지도 「확대」를 누르면 배율 숫자가 1 오른다', (await 화면.배율숫자()) - 이전, 1);
  });

  await test.step('오시는 길 지도의 「축소」를 누른다', async () => {
    const 이전 = await 화면.배율숫자();
    await 화면.축소.click();
    await verify('지도 「축소」를 누르면 배율 숫자가 1 내린다', 이전 - (await 화면.배율숫자()), 1);
  });
});
