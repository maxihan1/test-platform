import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-281',
  name: '회원정보 수정의 아이디 칸은 흐리게 보이고 고칠 수 없다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 프로필 = new 회원정보수정화면(page);

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('회원정보 수정에서 비밀번호를 확인한다', async () => {
      await 프로필.열기();
      await 프로필.비밀번호확인하기(정보.password);
      await verify('회원정보 수정의 아이디 칸은 흐리게 보이고 고칠 수 없다', await 프로필.아이디.isDisabled(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
