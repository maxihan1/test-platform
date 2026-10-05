import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-132',
  name: '비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다',
  techniques: ['결정 테이블'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);

  await test.step('로그인 화면 아이디 칸에만 값을 적는다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('로그인 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.아이디칸.fill('sample1');
    await verify('비밀번호 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 화면.로그인버튼.isEnabled(), false);
  });

  await test.step('아이디 칸을 비우고 비밀번호 칸에만 값을 적는다', async () => {
    await 화면.아이디칸.fill('');
    await 화면.비밀번호칸.fill('Sample!pw1');
    await verify('아이디 칸이 비어 있으면 「로그인」 버튼이 눌리지 않는다', await 화면.로그인버튼.isEnabled(), false);
  });
});
