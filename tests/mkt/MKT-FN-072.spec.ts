import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 안내화면 } from './components/notice-screen.component.js';
import { API로그아웃, 계정값 } from './helpers/account.helper.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-072',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 안내 = new 안내화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('로그인 화면에서 맞는 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.로그인하기(계정.loginId, 계정.password);
    await 머리.로그아웃.waitFor();
    await verify('맞는 아이디와 비밀번호로 로그인하면 홈 화면으로 간다', 경로(page), '/');
  });

  await test.step('로그아웃해 비회원으로 돌아간다', async () => {
    await API로그아웃(page.request);
  });

  await test.step('비회원으로 돌아왔는지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('로그인 화면 주소에 next=/support 를 달고 로그인한다', async () => {
    await 로그인.열기('/support');
    await 로그인.제목.waitFor();
    await 로그인.로그인하기(계정.loginId, 계정.password);
    await 안내.제목글('고객센터').waitFor();
    await verify('돌아갈 주소를 단 로그인 화면에서 로그인하면 그 화면으로 간다', 경로(page), '/support');
  });
});
