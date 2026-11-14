import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 해시태그화면 } from './pages/hashtag.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-622',
  name: '비회원이 해시태그 화면을 열면 그 태그 공개 글이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 해시태그화면(page);

  await test.step('비회원으로 #오늘의사진 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기('오늘의사진');
    const 제목보임 = await 화면.제목('오늘의사진').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('#오늘의사진 화면 제목이 보인다', 제목보임, true, { blocker: true });
    const 글있음 = await 화면.첫글.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('해시태그 화면에 글이 보인다', 글있음, true, { blocker: true });
    await verify('비회원이 해시태그 화면을 열면 그 태그 공개 글이 보인다', await 화면.태그글('오늘의사진').first().isVisible(), true);
  });
});
