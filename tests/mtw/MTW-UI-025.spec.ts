import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-025',
  name: '정보 화면의 서버 썸네일에 「ALT」 배지가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 정보화면(page);

  await test.step('정보 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('정보 화면에 서버 이름이 보인다', await 화면.서버이름.isVisible(), true, { blocker: true });
    await verify('정보 화면의 서버 썸네일에 「ALT」 배지가 보인다', await 화면.알트배지.isVisible(), true);
  });
});
