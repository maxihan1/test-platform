import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-307',
  name: 'category=자유 로 부르면 공지를 뺀 글이 모두 자유 분류다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 제목 = '';

  try {
    await test.step('회원으로 로그인해 글을 하나 쓴다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
      제목 = (await 글하나쓰기(나.api, '검색글')).제목;
    });

    await test.step('로그인한 요청인지 확인한다', async () => {
      await verify('회원으로 로그인한 요청이다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('GET /api/posts?category=자유 를 부른다', async () => {
      const res = await request.get('/api/posts', { params: { category: '자유', size: 50 } });
      const 글들 = ((await res.json()) as { items: { category: string }[] }).items;
      await verify('category=자유 로 부르면 공지를 뺀 글이 모두 자유 분류다', 글들.length > 0 && 글들.every((글) => 글.category === '자유'), true);
    });

    await test.step('GET /api/posts?sort=views 를 부른다', async () => {
      const res = await request.get('/api/posts', { params: { sort: 'views', size: 50 } });
      const 조회수들 = ((await res.json()) as { items: { views: number }[] }).items.map((글) => 글.views);
      await verify('sort=views 로 부르면 공지를 뺀 글이 조회수가 많은 순이다', 조회수들.length > 1 && 조회수들.every((값, 차례) => 차례 === 0 || (조회수들[차례 - 1] ?? 0) >= 값), true);
    });

    await test.step('GET /api/posts?field=title&q=<검색어> 를 부른다', async () => {
      const res = await page.request.get('/api/posts', { params: { field: 'title', q: 제목, size: 50 } });
      const 글들 = ((await res.json()) as { items: { title: string }[] }).items;
      await verify('field=title 과 q 로 부르면 제목에 검색어가 든 글만 돌아온다', 글들.length > 0 && 글들.every((글) => 글.title.includes(제목)), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
