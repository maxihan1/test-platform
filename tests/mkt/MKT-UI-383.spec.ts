import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 없는주소화면 } from './pages/error.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-383',
  name: '없는 주소 화면에서 「홈으로」를 누르면 홈 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 안내 = new 없는주소화면(page);
  const 홈 = new 홈화면(page);

  await test.step('없는 주소 화면을 연다', async () => {
    await 방해창막기(page);
    await 안내.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 안내.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('없는 주소 화면 제목 「페이지를 찾을 수 없습니다」가 보인다', await 안내.제목.isVisible(), true, { blocker: true });
  });

  await test.step('없는 주소 화면에서 「홈으로」를 누른다', async () => {
    await 안내.홈으로버튼.click();
    await verify('없는 주소 화면에서 「홈으로」를 누르면 홈 화면이 보인다', await 나타났나(홈.제목), true);
  });
});
