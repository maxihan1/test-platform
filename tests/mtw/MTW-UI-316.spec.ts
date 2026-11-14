import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';
import { 유행중화면 } from './pages/explore.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-316',
  name: '로그인 전 화면에서 「이 서버에 대한 더 많은 정보」를 누르면 /about 으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 유행 = new 유행중화면(page);
  const 정보 = new 정보화면(page);

  await test.step('로그인 전 화면에서 「이 서버에 대한 더 많은 정보」를 누른다', async () => {
    await 한국어로(page);
    await 유행.열기();
    await 정보.틀.서버더보기.click();
    await 정보.서버이름.waitFor();
    await verify('로그인 전 화면에서 「이 서버에 대한 더 많은 정보」를 누르면 /about 으로 간다', new URL(page.url()).pathname, '/about');
  });
});
