import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-148',
  name: '마지막 페이지 번호를 누르면 「다음」 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록에서 마지막 페이지 번호를 누른다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    const 마지막 = Math.max(...(await 목록.쪽번호들읽기()));
    await 목록.쪽누르고기다리기(마지막);
    await verify('마지막 페이지 번호를 누르면 「다음」 버튼이 눌리지 않는다', await 목록.다음버튼.isDisabled(), true);
  });
});
