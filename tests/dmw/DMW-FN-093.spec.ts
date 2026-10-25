import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 모달 } from './components/modal.component.js';
import { 비밀번호틀리기, 일회용회원만들기 } from './helpers/account.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-093',
  name: '로그인에 성공한 뒤에는 다시 4번 틀려도 잠금 안내가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    wrongPass: z.string().describe('틀린 비밀번호 — 일회용 회원의 비밀번호와 다른 값').default('Wrong1!pass'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 로그인 = new 로그인화면(page);
  const 홈 = new 홈화면(page);
  const 확인창 = new 모달(page, '확인');
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호를 4번 틀린 뒤 맞게 로그인하고 로그아웃한 뒤 다시 4번 틀린다', async () => {
    await 비밀번호틀리기(request, 회원.loginId, 4);
    await 로그인.적기(회원.loginId, 회원.password);
    await 로그인.로그인누르기();
    await 홈.그려질때까지();
    await verify('4번 틀린 뒤 맞게 로그인하면 머리글에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    await 홈.머리.로그아웃누르기();
    await 확인창.뜰때까지();
    await 확인창.버튼('확인').click();
    await 홈.머리.로그인.waitFor();
    await verify('로그아웃하면 머리글에 「로그인」이 보인다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await 로그인.열기();
    for (let 번 = 0; 번 < 4; 번 += 1) {
      await 로그인.실패하는시도(회원.loginId, params.wrongPass);
    }
    await verify('로그인에 성공한 뒤에는 다시 4번 틀려도 잠금 안내가 보이지 않는다', await 로그인.잠금안내.isVisible(), false);
  });
});
