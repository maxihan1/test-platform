import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-242',
  name: '「위 내용을 확인했습니다」를 켜면 「탈퇴하기」가 눌린다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 탈퇴화면 = new 회원탈퇴화면(page);

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('회원 탈퇴 화면에서 「위 내용을 확인했습니다」를 켠다', async () => {
      await 탈퇴화면.열기();
      await 탈퇴화면.확인체크.check();
      await verify('「위 내용을 확인했습니다」를 켜면 「탈퇴하기」가 눌린다', await 탈퇴화면.탈퇴하기.isEnabled(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
