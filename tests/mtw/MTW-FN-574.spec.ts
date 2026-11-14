import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-574',
  name: '비회원으로 hana_photo 프로필을 열면 프로필과 글이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('비회원으로 hana_photo 프로필을 연다', async () => {
    await 한국어로(page);
    await 프로필.열기('hana_photo');
    await 프로필.첫글그려질때까지();
    const 머리 = await verify('프로필 머리에 표시 이름이 보인다', await 프로필.표시이름.isVisible(), true);
    const 글 = await verify('프로필에 글이 보인다', (await 프로필.글('').count()) > 0, true);
    await verify('비회원으로 hana_photo 프로필을 열면 프로필과 글이 보인다', 머리 && 글, true);
  });
});
