import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-032',
  name: '회원가입 화면 비밀번호 칸 오른쪽에 눈 모양 버튼이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await verify(
      '회원가입 화면 비밀번호 칸 오른쪽에 눈 모양 버튼이 보인다',
      (await 화면.눈버튼.isVisible()) && (await 화면.눈버튼이칸오른쪽에있나()),
      true,
    );
  });
});
