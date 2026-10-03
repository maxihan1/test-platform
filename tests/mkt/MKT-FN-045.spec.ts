import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

type 글요약 = { title: string };

export const spec = defineCase({
  tcId: 'MKT-FN-045',
  name: '검색어가 1자면 토스트 「검색어를 2자 이상 입력하세요」가 보이고 2자면 보이지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 알림 = new 토스트(page);
  const 전체 = (await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[];
  const 첫글 = 전체[전체.length - 1]?.title ?? '';

  await test.step('검색어를 1자만 적고 검색한다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await 목록.검색하기('제목', 첫글.slice(0, 1));
    await verify('검색어가 1자면 토스트 「검색어를 2자 이상 입력하세요」가 보인다', await 알림.문구('검색어를 2자 이상 입력하세요').isVisible(), true);
  });

  await test.step('검색어를 2자로 적고 검색한다', async () => {
    await 알림.문구('검색어를 2자 이상 입력하세요').waitFor({ state: 'detached' });
    await 목록.검색하기('제목', 첫글.slice(0, 2));
    await 목록.글줄().first().waitFor();
    await verify('검색어가 2자면 토스트 「검색어를 2자 이상 입력하세요」가 보이지 않는다', await 알림.문구('검색어를 2자 이상 입력하세요').isVisible(), false);
  });
});
