import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-104',
  name: '관심 분야를 3개 켜면 3개 모두 선택된다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 알림 = new 토스트(page);

  await test.step('관심 분야 「패션」 · 「전자기기」 · 「도서」를 켠다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.관심분야('패션').check();
    await 화면.관심분야('전자기기').check();
    await 화면.관심분야('도서').check();
    await verify(
      '관심 분야를 3개 켜면 3개 모두 선택된다',
      [await 화면.관심분야('패션').isChecked(), await 화면.관심분야('전자기기').isChecked(), await 화면.관심분야('도서').isChecked()],
      [true, true, true],
    );
  });

  await test.step('넷째 관심 분야 「식품」을 켠다', async () => {
    await 화면.관심분야('식품').click();
    await verify(
      '넷째를 고르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다',
      await 알림.문구('관심 분야는 최대 3개까지 선택할 수 있습니다').first().isVisible(),
      true,
    );
    await verify('넷째 관심 분야 「식품」은 선택되지 않는다', await 화면.관심분야('식품').isChecked(), false);
  });
});
