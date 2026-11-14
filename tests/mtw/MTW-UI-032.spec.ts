import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-032',
  name: '비회원 유행 중 화면의 탭은 「게시물」 · 「해시태그」 · 「소식」 셋이다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 유행중화면(page);

  await test.step('비회원으로 유행 중 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('유행 중 화면이 열려 있다', new URL(page.url()).pathname, '/explore', { blocker: true });
    const 게시물 = await verify('「게시물」 탭이 보인다', await 화면.게시물탭.isVisible(), true);
    const 해시태그 = await verify('「해시태그」 탭이 보인다', await 화면.해시태그탭.isVisible(), true);
    const 소식 = await verify('「소식」 탭이 보인다', await 화면.소식탭.isVisible(), true);
    await verify('비회원 유행 중 화면의 탭은 「게시물」 · 「해시태그」 · 「소식」 셋이다', 게시물 && 해시태그 && 소식, true);
  });
});
