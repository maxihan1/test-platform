import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-035',
  name: '회원가입 화면 관심 분야에 「패션」 · 「전자기기」 · 「도서」 · 「식품」 체크박스가 보인다',
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
      '회원가입 화면 관심 분야에 「패션」 · 「전자기기」 · 「도서」 · 「식품」 체크박스가 보인다',
      [
        await 화면.관심분야('패션').isVisible(),
        await 화면.관심분야('전자기기').isVisible(),
        await 화면.관심분야('도서').isVisible(),
        await 화면.관심분야('식품').isVisible(),
      ],
      [true, true, true, true],
    );
  });
});
