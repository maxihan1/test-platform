import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-129',
  name: '쇼핑 화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify(
      '쇼핑 화면 오른쪽 아래에 말풍선 모양 상담 버튼이 보인다',
      [await 쇼핑.상담.열기버튼.isVisible(), await 쇼핑.상담.버튼글자(), await 쇼핑.상담.버튼이오른쪽아래인가()],
      [true, '💬', true],
    );
    await verify('상담 버튼과 상담 창은 분리된 영역(Shadow DOM) 안에 있다', await 쇼핑.상담.분리된영역안에만있나(), true);
  });
});
