import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-093',
  name: '비밀번호 확인이 비밀번호와 다르면 「비밀번호가 일치하지 않습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면에서 비밀번호와 다른 값을 비밀번호 확인 칸에 적고 칸을 벗어난다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.비밀번호칸.fill('Ab1!wxyz');
    await 화면.비밀번호확인칸.fill('Ab1!wxyZ');
    await 화면.칸벗어나기(화면.비밀번호확인칸);
    await verify(
      '비밀번호 확인이 비밀번호와 다르면 「비밀번호가 일치하지 않습니다」가 보인다',
      await 화면.오류문구('passwordConfirm').filter({ hasText: '비밀번호가 일치하지 않습니다' }).isVisible(),
      true,
    );
  });
});
