import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-005',
  name: '머리글 「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);
  const 확인창 = new 모달(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 정보?.loginId, true, { blocker: true });
    });

    await test.step('홈을 연다', async () => {
      await 방해막기(page);
      await 홈.열기();
      await 머리.로그아웃.waitFor();
    });

    await test.step('머리글 「로그아웃」을 누른다', async () => {
      await 머리.로그아웃.click();
      await 확인창.창.waitFor();
      await verify('머리글 「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 보인다', await 확인창.창.getByText('로그아웃 하시겠습니까?').isVisible(), true);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
