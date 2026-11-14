import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-513',
  name: '비회원이 게시물을 검색하면 「로그인되어 있을 때만 할 수 있습니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});
test(spec, async ({ page }) => {
  const 검색 = new 검색화면(page);

  await test.step('비회원으로 검색 결과 「게시물」 탭을 연다', async () => {
    await 한국어로(page);
    await 검색.열기('hana');
    await 검색.탭('게시물').click();
    const 떴다 = await 검색.결과글('로그인되어 있을 때만 할 수 있습니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('비회원이 게시물을 검색하면 「로그인되어 있을 때만 할 수 있습니다.」가 보인다', 떴다, true);
  });
});
