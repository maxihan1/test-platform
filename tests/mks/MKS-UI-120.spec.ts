import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 로그인한아이디, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-120',
  name: '문의한 적이 없는 회원의 「내 문의 내역」에 「문의 내역이 없습니다」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  let 정보!: 회원정보;

  try {
    await test.step('새 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('새 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', await 로그인한아이디(page.request), 정보.loginId, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
      await 문의.제목.waitFor();
      await verify('1:1 문의 화면이 열려 있다', 경로(page), 문의화면.주소, { blocker: true });
      await 문의.내역없음.waitFor();
      await verify('문의한 적이 없는 회원의 「내 문의 내역」에 「문의 내역이 없습니다」가 보인다', await 문의.내역없음.isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
