import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 없는주소화면 } from './pages/error.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-021',
  name: '없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 안내 = new 없는주소화면(page);

  await test.step('없는 주소 「/no-such-page」를 연다', async () => {
    await 방해창막기(page);
    await 안내.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 안내.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다',
      { 제목: await 안내.제목.isVisible(), 홈으로: await 안내.홈으로버튼.isVisible() },
      { 제목: true, 홈으로: true },
    );
  });
});
