import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 경로, 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-130',
  name: '로그인 화면에 아이디 입력칸 · 비밀번호 입력칸 · 「로그인 상태 유지」 체크박스가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('로그인 화면을 연다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
    await verify(
      '로그인 화면에 아이디 입력칸 · 비밀번호 입력칸 · 「로그인 상태 유지」 체크박스가 보인다',
      await 보이는이름들({ '아이디 입력칸': 로그인.아이디, '비밀번호 입력칸': 로그인.비밀번호, '「로그인 상태 유지」 체크박스': 로그인.상태유지 }),
      '아이디 입력칸, 비밀번호 입력칸, 「로그인 상태 유지」 체크박스',
    );
  });
});
