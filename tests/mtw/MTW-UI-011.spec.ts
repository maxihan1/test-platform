import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 정보화면 } from './pages/about.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-011',
  name: '로그인 전 오른쪽 하단에서 「계정 생성」을 누르면 /auth/sign_up 으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 정보 = new 정보화면(page);

  await test.step('로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 정보.열기();
    await verify('로그인 전 오른쪽 하단에 「계정 생성」이 보인다', await 정보.틀.계정생성.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 전 오른쪽 하단에서 「계정 생성」을 누른다', async () => {
    await 정보.틀.계정생성.click();
    await 정보.틀.가입등록.waitFor();
    await verify('로그인 전 오른쪽 하단에서 「계정 생성」을 누르면 /auth/sign_up 으로 간다', new URL(page.url()).pathname, '/auth/sign_up');
  });

  await test.step('로그인 전 화면을 다시 연다', async () => {
    await 정보.열기();
    await verify('다시 연 로그인 전 오른쪽 하단에 「로그인」이 보인다', await 정보.틀.로그인.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 전 오른쪽 하단에서 「로그인」을 누른다', async () => {
    await 정보.틀.로그인.click();
    await 정보.틀.로그인제목.waitFor();
    await verify('「로그인」 버튼은 /auth/sign_in 으로 이어진다', new URL(page.url()).pathname, '/auth/sign_in');
  });
});
