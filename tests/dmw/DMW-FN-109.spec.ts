import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-109',
  name: '게시판 목록 한 쪽에는 공지 말고 글이 10개 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, request }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 첫 쪽의 글 수를 센다', async () => {
    await verify('게시판 목록 한 쪽에는 공지 말고 글이 10개 보인다', (await 목록.일반행들()).length, 10);
  });

  await test.step('게시판 목록 2쪽을 연다', async () => {
    let 화면첫글: string | undefined;
    let 열한번째: string | undefined;
    for (let 번 = 0; 번 < 3; 번 += 1) {
      await 목록.열기({ 쪽: 2 });
      화면첫글 = (await 목록.일반행들())[0]?.제목;
      const 응답 = await request.get('/api/posts?sort=latest&page=1&size=11');
      열한번째 = ((await 응답.json()) as { items: { title: string }[] }).items[10]?.title;
      if (화면첫글 === 열한번째) break;
    }
    await verify('첫 쪽 다음 11번째 글은 2쪽 첫 줄에 보인다', 화면첫글, 열한번째);
  });
});
