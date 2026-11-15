import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 해시태그화면 } from './pages/hashtag.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-209',
  name: '비회원 #오늘의사진 화면 머리말에는 「해시태그 팔로우」가 없다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 해시태그화면(page);

  await test.step('비회원으로 #오늘의사진 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기('오늘의사진');
    const 제목 = await 화면.제목('오늘의사진').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('#오늘의사진 화면 제목이 보인다', 제목, true, { blocker: true });
    await verify('비회원 #오늘의사진 화면 머리말에는 「해시태그 팔로우」가 없다', await 화면.팔로우버튼.count(), 0);
  });
});
