import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-034',
  name: '회원가입 화면 성별에 「선택 안 함」 · 「남성」 · 「여성」 라디오 버튼이 보인다',
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
      '회원가입 화면 성별에 「선택 안 함」 · 「남성」 · 「여성」 라디오 버튼이 보인다',
      [await 화면.성별('선택 안 함').isVisible(), await 화면.성별('남성').isVisible(), await 화면.성별('여성').isVisible()],
      [true, true, true],
    );
    await verify('성별은 처음에 「선택 안 함」이 골라져 있다', await 화면.성별('선택 안 함').isChecked(), true);
  });
});
