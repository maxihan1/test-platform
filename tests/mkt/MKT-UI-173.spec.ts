import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 없는주소화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-173',
  name: '없는 주소 화면에 「주소가 바뀌었거나 삭제된 페이지입니다.」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  unconfirmed: '기획서와 다름 — 차이 D4: 없는 주소 화면에 기획서에 없는 안내 문장이 있다 (작성 요청 5873)',
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 없는주소 = new 없는주소화면(page);

  await test.step('없는 주소 화면을 연다', async () => {
    await 안내창끄기(page);
    await 없는주소.열기();
    await verify('비회원이다', await 없는주소.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('없는 주소 화면에 「주소가 바뀌었거나 삭제된 페이지입니다.」가 보인다', await 없는주소.안내문장.isVisible(), true);
  });
});
