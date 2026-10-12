import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 새회원으로로그인, type 회원정보 } from './helpers/account.helper.js';
import { 가입자정리하기, 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-011',
  name: '「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);
  const 확인창 = new 모달(page);
  let 정보: 회원정보 | undefined;

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 정보?.loginId, true, { blocker: true });
    });

    await test.step('머리글 「로그아웃」을 누른다', async () => {
      await 방해막기(page);
      await 홈.열기();
      await 머리.로그아웃.waitFor();
      await 머리.로그아웃.click();
      await 확인창.창.waitFor();
      await verify('「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다', await 확인창.창.getByText('로그아웃 하시겠습니까?').isVisible(), true);
    });

    await test.step('로그아웃 확인 창에서 「확인」을 누른다', async () => {
      await 확인창.버튼('확인').click();
      await 머리.로그인.waitFor();
      await verify(
        '로그아웃 확인 창에서 「확인」을 누르면 홈으로 가고 머리글에 「로그인」이 보인다',
        { 화면: 경로(page), 로그인링크: await 머리.로그인.isVisible() },
        { 화면: '/', 로그인링크: true },
      );
    });
  } finally {
    if (정보 !== undefined) await 가입자정리하기(page.request, 정보);
  }
});
