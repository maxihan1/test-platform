import { defineCase, test, verify } from '@platform/kit';

import { 경로, 세션아이디, 응답붙잡기 } from './helpers/common-tools.helper.js';
import { 로그인단추, 로그인로딩표시 } from './helpers/board-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-006',
  name: '로그인 응답을 기다리는 동안 「로그인」 버튼이 꺼져 있다',
  precondition: ['로그인 응답이 늦게 온다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  let 붙잡음: { 풀기: () => Promise<void> } | undefined;

  try {
    await test.step('비회원이 로그인 화면을 연다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
    });

    await test.step('로그인 화면이 열렸는지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
      await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
    });

    await test.step('로그인 화면에서 없는 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      붙잡음 = await 응답붙잡기(page, '**/api/auth/login');
      const 요청 = page.waitForRequest('**/api/auth/login');
      await 로그인.로그인하기('nouser-board', 'Wrong1234!');
      await 요청;
      await verify('로그인 응답을 기다리는 동안 「로그인」 버튼이 꺼져 있다', await 로그인단추(로그인.폼).isDisabled(), true);
      await 붙잡음.풀기();
      붙잡음 = undefined;
      await 로그인.오류.filter({ hasText: /\S/ }).waitFor();
    });

    await test.step('로그인 화면에서 「로그인」을 누르고 응답을 기다린다', async () => {
      붙잡음 = await 응답붙잡기(page, '**/api/auth/login');
      const 요청 = page.waitForRequest('**/api/auth/login');
      await 로그인.로그인.click();
      await 요청;
      await verify(
        '로그인 응답을 기다리는 동안 버튼에 「로그인」 글자 대신 로딩 표시가 보인다',
        { 로딩표시: await 로그인로딩표시(로그인.폼).isVisible(), 버튼글자: (await 로그인단추(로그인.폼).innerText()).trim() },
        { 로딩표시: true, 버튼글자: '' },
      );
    });
  } finally {
    await 붙잡음?.풀기();
  }
});
