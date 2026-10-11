import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { API로그인, 계정값 } from './helpers/account.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-083',
  name: '로그아웃 확인 창에서 「확인」을 누르면 홈 화면 머리글에 「로그인」이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);
  const 확인창 = new 모달(page);

  await test.step('회원으로 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('로그인한 회원인지 확인한다', async () => {
    await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 계정.loginId, true, { blocker: true });
  });

  await test.step('홈을 열고 머리글 「로그아웃」을 눌러 확인 창을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 머리.로그아웃.click();
    await 확인창.창.waitFor();
  });

  await test.step('로그아웃 확인 창이 떠 있는지 확인한다', async () => {
    await verify('로그아웃 확인 창이 보인다', await 확인창.창.getByText('로그아웃 하시겠습니까?').isVisible(), true, { blocker: true });
  });

  await test.step('로그아웃 확인 창에서 「확인」을 누른다', async () => {
    await 확인창.버튼('확인').click();
    await 머리.로그인.waitFor();
    await verify('로그아웃 확인 창에서 「확인」을 누르면 홈 화면 머리글에 「로그인」이 보인다', await 머리.로그인.isVisible(), true);
  });
});
