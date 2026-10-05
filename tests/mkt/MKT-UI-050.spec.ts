import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-050',
  name: '게시판 목록 아래에 페이지 번호와 「이전」 · 「다음」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록을 연다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    const 보임 = (await 목록.쪽번호들읽기()).length > 0 && (await 목록.이전버튼.isVisible()) && (await 목록.다음버튼.isVisible());
    await verify('게시판 목록 아래에 페이지 번호와 「이전」 · 「다음」 버튼이 보인다', 보임, true);
    await verify('첫 페이지에서는 「이전」 버튼이 눌리지 않는다', await 목록.이전버튼.isDisabled(), true);
  });
});
