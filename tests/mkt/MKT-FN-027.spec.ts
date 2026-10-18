import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-027',
  name: '처음 머리글 높이는 64px 이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 머리글 높이를 확인한다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('처음 머리글 높이는 64px 이다', await 홈.머리글높이(), 64);
  });

  await test.step('홈 화면을 200px 내린다', async () => {
    await 홈.아래로내리기(200);
    await 홈.머리글전환끝날때까지();
    await verify('머리글이 붙으면 머리글 높이가 48px 이다', await 홈.머리글높이(), 48);
  });
});
