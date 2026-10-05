import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-195',
  name: '비회원에게는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);

  await test.step('비회원으로 게시글 상세를 연다', async () => {
    await 안내창끄기(page);
    await 상세.열기(await 시드글번호(page.request));
    await 상세.로그인유도링크.waitFor();
    await verify(
      '비회원에게는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
      { 링크: await 상세.로그인유도링크.isVisible(), 입력칸: await 상세.댓글입력칸.count() },
      { 링크: true, 입력칸: 0 },
    );
  });
});
