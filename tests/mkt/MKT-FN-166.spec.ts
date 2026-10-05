import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-166',
  name: '게시글 상세를 다시 열면 조회수가 1 오른다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);

  await test.step('게시글 상세를 열고 한 번 더 새로 고친다', async () => {
    await 안내창끄기(page);
    await 상세.열기(await 시드글번호(page.request));
    const 처음 = await 상세.조회수읽기();
    await 상세.새로고침하고기다리기();
    await verify('게시글 상세를 다시 열면 조회수가 1 오른다', (await 상세.조회수읽기()) - 처음, 1);
  });
});
