import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-026',
  name: '79px 내리면 머리글이 화면 위에 붙지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면을 79px 내린다', async () => {
    await 홈.아래로내리기(79);
    await verify('79px 내리면 머리글이 화면 위에 붙지 않는다', await 홈.머리글붙었나(), false);
  });

  await test.step('홈 화면을 80px 내린다', async () => {
    await 홈.아래로내리기(80);
    await verify('80px 내리면 머리글이 화면 위에 붙어 따라 내려온다', await 홈.머리글붙었나(), true);
  });
});
