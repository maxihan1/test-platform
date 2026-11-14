import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-317',
  name: '로그인 전 화면에서 로고를 누르면 /explore 로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 정보 = new 정보화면(page);
  const 유행 = new 유행중화면(page);

  await test.step('로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 정보.열기();
    await verify('로그인 전 화면 오른쪽 위에 로고가 보인다', await 정보.틀.메뉴.로고.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 전 화면에서 로고를 누른다', async () => {
    await 정보.틀.메뉴.로고.click();
    await 유행.그려질때까지();
    await verify('로그인 전 화면에서 로고를 누르면 /explore 로 간다', new URL(page.url()).pathname, '/explore');
  });
});
