import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-392',
  name: '회원정보 수정에서 틀린 비밀번호로 재확인하면 「비밀번호가 올바르지 않습니다」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  let 정보!: 회원정보;
  const 프로필 = new 회원정보수정화면(page);

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원정보 수정 화면을 연다', async () => {
      await 프로필.열기();
    });

    await test.step('비밀번호 확인 칸이 보이는지 확인한다', async () => {
      await verify('회원정보 수정에 비밀번호 확인 칸이 보인다', await 프로필.비밀번호.isVisible(), true, { blocker: true });
    });

    await test.step('회원정보 수정에서 틀린 비밀번호를 적고 확인한다', async () => {
      await 프로필.비밀번호.fill(`${정보.password}x`);
      await 프로필.비밀번호확인.click();
      await 프로필.비밀번호오류.filter({ hasText: /\S/ }).waitFor();
      await verify('회원정보 수정에서 틀린 비밀번호로 재확인하면 「비밀번호가 올바르지 않습니다」가 보인다', (await 프로필.비밀번호오류.innerText()).trim(), '비밀번호가 올바르지 않습니다');
    });
  } finally {
    await 탈퇴(page.request);
  }
});
