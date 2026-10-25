import { defineCase, test, verify } from '@platform/kit';

import { 응답붙잡기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-048',
  name: '이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 늦게 도착하면 배너와 글 탭 사이에 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  const 붙잡음 = await 응답붙잡기(page, '**/api/event-strip');
  let 띠가오기전: number | undefined;

  try {
    await test.step('이벤트 띠 응답을 기다린다', async () => {
      await 홈.열기();
      await 홈.배너.그려질때까지();
      await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
      await verify('이벤트 띠 응답이 아직 오지 않았다', await 홈.이벤트띠.isVisible(), false, { blocker: true });
      띠가오기전 = await 홈.글탭자리();
      await 붙잡음.놓기();
      await 홈.이벤트띠.waitFor();
      await verify(
        '이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 늦게 도착하면 배너와 글 탭 사이에 보인다',
        await 홈.이벤트띠가배너와글탭사이인가(),
        true,
      );
    });

    await test.step('띠가 들어오기 전과 뒤 글 탭 자리를 견준다', async () => {
      const 띠가온뒤 = await 홈.글탭자리();
      await verify('이벤트 띠가 들어오면 글 탭이 아래로 밀린다', 띠가온뒤 > (띠가오기전 ?? Number.MAX_SAFE_INTEGER), true);
    });
  } finally {
    await 붙잡음.놓기();
  }
});
