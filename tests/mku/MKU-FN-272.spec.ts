import { defineCase, test, verify } from '@platform/kit';

import { 안내화면 } from './components/notice-screen.component.js';
import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKU-FN-272',
  name: '일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다',
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 안내 = new 안내화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('관리자 화면 /admin 을 연다', async () => {
      await page.goto('/admin');
      await verify('일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다', await 안내.제목글('권한이 없습니다').isVisible(), true);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
