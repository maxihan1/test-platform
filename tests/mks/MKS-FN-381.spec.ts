import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-381',
  name: 'FAQ 질문을 누르면 그 질문의 답이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 방해막기(page);
    await 고객센터.열기();
  });

  await test.step('고객센터 화면이 열렸는지 확인한다', async () => {
    await 고객센터.제목.waitFor();
    await verify('고객센터 화면이 열려 있다', 경로(page), 고객센터화면.주소, { blocker: true });
  });

  await test.step('고객센터에서 FAQ 질문 「비밀번호를 잊어버렸어요.」를 누른다', async () => {
    await 고객센터.질문('비밀번호를 잊어버렸어요.').click();
    await 고객센터.펼친질문('비밀번호를 잊어버렸어요.').waitFor();
    await verify('FAQ 질문을 누르면 그 질문의 답이 보인다', await 고객센터.답변('비밀번호를 잊어버렸어요.').isVisible(), true);
  });
});
