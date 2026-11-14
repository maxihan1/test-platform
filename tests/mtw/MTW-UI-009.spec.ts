import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';
import { 유행중화면 } from './pages/explore.page.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-009',
  name: '로그인 전 오른쪽 메뉴에서 「유행 중」을 누르면 /explore 로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 정보 = new 정보화면(page);
  const 유행 = new 유행중화면(page);
  const 피드 = new 실시간피드화면(page);

  await test.step('로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 정보.열기();
    await verify('로그인 전 오른쪽 메뉴에 「유행 중」이 보인다', await 정보.틀.유행중.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 전 오른쪽 메뉴에서 「유행 중」을 누른다', async () => {
    await 정보.틀.유행중.click();
    await 유행.그려질때까지();
    await verify('로그인 전 오른쪽 메뉴에서 「유행 중」을 누르면 /explore 로 간다', new URL(page.url()).pathname, '/explore');
  });

  await test.step('로그인 전 오른쪽 메뉴에서 「실시간 피드」를 누른다', async () => {
    await 정보.틀.실시간피드.click();
    await 피드.그려질때까지();
    await verify('「실시간 피드」 메뉴는 /public/local 로 이어진다', new URL(page.url()).pathname, '/public/local');
  });
});
