import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-062',
  name: '게시글 상세 아래에 「목록」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);

  await test.step('게시글 상세를 연다', async () => {
    await 안내창끄기(page);
    await 상세.열기(await 시드글번호(page.request));
    await verify('게시글 상세 아래에 「목록」 버튼이 보인다', await 상세.목록버튼.isVisible(), true);
  });
});
