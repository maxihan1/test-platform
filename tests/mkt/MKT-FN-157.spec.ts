import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-157',
  name: '정렬에서 「조회순」을 고르면 공지를 뺀 글이 조회수 많은 순으로 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

const 많은순 = (수들: number[]) => 수들.length > 1 && 수들.every((수, 자리) => 자리 === 0 || (수들[자리 - 1] ?? 0) >= 수);

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 정렬에서 「조회순」을 고른다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await 목록.정렬고르고기다리기('조회순');
    const 조회수들 = (await 목록.일반글읽기()).map((행) => 행.조회수);
    await verify('정렬에서 「조회순」을 고르면 공지를 뺀 글이 조회수 많은 순으로 보인다', 많은순(조회수들), true);
  });

  await test.step('정렬에서 「좋아요순」을 고른다', async () => {
    await 목록.정렬고르고기다리기('좋아요순');
    const 좋아요들 = (await 목록.일반글읽기()).map((행) => 행.좋아요);
    await verify('공지를 뺀 글이 좋아요 많은 순으로 보인다', 많은순(좋아요들), true);
  });
});
