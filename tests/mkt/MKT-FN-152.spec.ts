import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-152',
  name: '검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 검색어에 한 글자 「백」을 적고 「검색」을 누른다', async () => {
    await 안내창끄기(page);
    await 목록.열기();
    await 목록.검색하기('제목', '백');
    const 토스트 = await 목록.토스트.기다리기('검색어를 2자 이상 입력하세요');
    await verify('검색어 1자로 검색하면 토스트 「검색어를 2자 이상 입력하세요」가 보인다', await 토스트.isVisible(), true);
  });

  await test.step('검색어에 두 글자 「백팩」을 적고 「검색」을 누른다', async () => {
    await 목록.토스트.전부.first().waitFor({ state: 'detached' });
    await 목록.검색하고기다리기('제목', '백팩');
    const 제목들 = (await 목록.일반글읽기()).map((행) => 행.제목);
    const 맞음 = (await 목록.토스트.전부.count()) === 0 && 제목들.length > 0 && 제목들.every((제목) => 제목.includes('백팩'));
    await verify('검색어 2자로 검색하면 토스트 없이 제목에 「백팩」이 든 글이 보인다', 맞음, true);
  });
});
