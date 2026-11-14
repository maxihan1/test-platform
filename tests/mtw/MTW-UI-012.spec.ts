import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';
import { 프로필책자화면 } from './pages/directory.page.js';
import { 유행중화면 } from './pages/explore.page.js';
import { 개인정보처리방침화면 } from './pages/privacy-policy.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-012',
  name: '로그인 전 왼쪽 하단에서 「정보」를 누르면 /about 으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 유행 = new 유행중화면(page);
  const 정보 = new 정보화면(page);
  const 책자 = new 프로필책자화면(page);
  const 방침 = new 개인정보처리방침화면(page);

  await test.step('로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 유행.열기();
    await verify('로그인 전 왼쪽 하단에 「정보」가 보인다', await 정보.틀.서버정보.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 전 왼쪽 하단에서 「정보」를 누른다', async () => {
    await 정보.틀.서버정보.click();
    await 정보.그려질때까지();
    await verify('로그인 전 왼쪽 하단에서 「정보」를 누르면 /about 으로 간다', new URL(page.url()).pathname, '/about');
  });

  await test.step('로그인 전 왼쪽 하단에서 「프로필 책자」를 누른다', async () => {
    await 정보.틀.프로필책자.click();
    await 책자.그려질때까지();
    await verify('「프로필 책자」 링크는 /directory 로 이어진다', new URL(page.url()).pathname, '/directory');
  });

  await test.step('로그인 전 왼쪽 하단에서 「개인정보처리방침」을 누른다', async () => {
    await 정보.틀.개인정보처리방침.click();
    await 방침.제목.waitFor();
    await verify('「개인정보처리방침」 링크는 /privacy-policy 로 이어진다', new URL(page.url()).pathname, '/privacy-policy');
  });
});
