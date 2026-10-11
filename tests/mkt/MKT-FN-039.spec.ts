import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-039',
  name: '아이디만 적으면 「로그인」 버튼이 눌리지 않는다',
  platforms: ['desktop'],
  precondition: [
    '비회원이다',
  ],
  techniques: ['결정 테이블'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('로그인 화면에서 아이디와 비밀번호를 둘 다 적는다', async () => {
    await 로그인.열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await 로그인.입력하기('아이디칸값', '비밀번호칸값');
    await verify('아이디와 비밀번호를 둘 다 적으면 「로그인」 버튼이 눌린다', await 로그인.로그인버튼.isEnabled(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 아이디만 적는다', async () => {
    await 로그인.비밀번호칸.fill('');
    await verify('아이디만 적으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
  });

  await test.step('로그인 화면에서 비밀번호만 적는다', async () => {
    await 로그인.아이디칸.fill('');
    await 로그인.비밀번호칸.fill('비밀번호칸값');
    await verify('비밀번호만 적으면 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
  });
});
