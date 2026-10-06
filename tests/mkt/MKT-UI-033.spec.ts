import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-033',
  name: '회원가입 화면에 이름 · 이메일 · 휴대폰 · 생년월일 칸이 보인다',
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
      '회원가입 화면에 이름 · 이메일 · 휴대폰 · 생년월일 칸이 보인다',
      [await 화면.이름칸.isVisible(), await 화면.이메일칸.isVisible(), await 화면.휴대폰칸.isVisible(), await 화면.생년월일칸.isVisible()],
      [true, true, true, true],
    );
    await verify('생년월일 칸은 날짜 선택기다', await 화면.생년월일칸.getAttribute('type'), 'date');
  });
});
