import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-103',
  name: '관심 분야를 여러 개 켜면 켠 것이 모두 선택된다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('관심 분야 「패션」과 「도서」를 켠다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.관심분야('패션').check();
    await 화면.관심분야('도서').check();
    await verify(
      '관심 분야를 여러 개 켜면 켠 것이 모두 선택된다',
      [await 화면.관심분야('패션').isChecked(), await 화면.관심분야('도서').isChecked()],
      [true, true],
    );
  });
});
