import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-244',
  name: '「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다',
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

    await test.step('확인을 켜고 「탈퇴하기」를 누른 뒤 확인 창을 닫는다', async () => {
      await 탈퇴화면.열기();
      await 탈퇴화면.확인체크.check();
      const 문구대기 = 탈퇴화면.확인창받기('dismiss');
      await 탈퇴화면.탈퇴하기.click();
      await verify('「탈퇴하기」를 누르면 브라우저 확인 창 「정말 탈퇴하시겠습니까?」가 뜬다', await 문구대기, '정말 탈퇴하시겠습니까?');
    });
  } finally {
    await 탈퇴(page.request);
  }
});
