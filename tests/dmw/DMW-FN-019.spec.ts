import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 없는주소화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-019',
  name: '없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 없는주소 = new 없는주소화면(page);
  await 안내창막기(page);

  await test.step('없는 주소를 연다', async () => {
    await 없는주소.열기();
    await verify('비회원이다', await 없는주소.머리.로그인.isVisible(), true, { blocker: true });
    const 안내 = await verify('「페이지를 찾을 수 없습니다」가 보인다', await 없는주소.안내.isVisible(), true);
    const 홈으로 = await verify('「홈으로」 버튼이 보인다', await 없는주소.홈으로.isVisible(), true);
    await verify('없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다', 안내 && 홈으로, true);
  });
});
