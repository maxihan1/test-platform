import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-128',
  name: '비회원 홈 머리글에 「로그인」 링크와 「회원가입」 링크가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.글링크들.first().waitFor();
    await 머리.그려질때까지();
    await verify(
      '비회원 홈 머리글에 「로그인」 링크와 「회원가입」 링크가 보인다',
      await 보이는이름들({ 로그인: 머리.로그인, 회원가입: 머리.회원가입 }),
      '로그인, 회원가입',
    );
  });
});
