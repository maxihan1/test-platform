import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-292',
  name: '「위 내용을 확인했습니다」를 체크하면 「탈퇴하기」가 눌린다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원탈퇴화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('회원 탈퇴 화면을 연다', async () => {
    await 화면.열기();
    await verify('회원 탈퇴 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 켠다', async () => {
    await 화면.확인체크.check();
    await verify('「위 내용을 확인했습니다」를 체크하면 「탈퇴하기」가 눌린다', await 화면.탈퇴하기.isEnabled(), true);
  });
});
