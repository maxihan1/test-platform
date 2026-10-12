import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-278',
  name: '회원정보 수정을 열면 비밀번호 확인 칸만 보이고 정보 칸은 보이지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 프로필 = new 회원정보수정화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('회원정보 수정을 연다', async () => {
      await 프로필.열기();
      await verify('회원정보 수정을 열면 비밀번호 확인 칸만 보이고 정보 칸은 보이지 않는다', (await 프로필.비밀번호.isVisible()) && !(await 프로필.이름.isVisible()), true);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
