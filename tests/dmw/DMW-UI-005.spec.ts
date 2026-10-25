import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-005',
  name: '비회원 머리글 오른쪽에 「로그인」 · 「회원가입」 링크가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
    const 로그인 = await verify('머리글 오른쪽에 「로그인」 링크가 보인다', await 홈.머리.로그인.isVisible(), true);
    const 회원가입 = await verify('머리글 오른쪽에 「회원가입」 링크가 보인다', await 홈.머리.회원가입.isVisible(), true);
    await verify('비회원 머리글 오른쪽에 「로그인」 · 「회원가입」 링크가 보인다', 로그인 && 회원가입, true);
  });
});
