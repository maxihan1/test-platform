import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-145',
  name: '「후기」 탭을 눌러도 공지글이 목록 맨 위에 고정되어 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록에서 「후기」 탭을 누른다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await 목록.탭누르고기다리기('후기');
    await 목록.선택된탭('후기').waitFor();
    const 첫줄 = (await 목록.행읽기())[0];
    await verify('「후기」 탭을 눌러도 공지글이 목록 맨 위에 고정되어 보인다', 첫줄?.공지, true);
  });
});
