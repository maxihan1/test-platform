import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-017',
  name: '바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 바닥 = new 바닥글(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 바닥.그려질때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('홈 화면 아래쪽 바닥글을 확인한다', async () => {
    const 이용약관 = await verify('바닥글에 「이용약관」 링크가 보인다', await 바닥.이용약관.isVisible(), true);
    const 방침 = await verify('바닥글에 「개인정보처리방침」 링크가 보인다', await 바닥.개인정보처리방침.isVisible(), true);
    const 저작권 = await verify('바닥글에 「© 2026 DemoMarket」이 보인다', await 바닥.저작권.isVisible(), true);
    await verify('바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다', 이용약관 && 방침 && 저작권, true);
  });
});
