import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 머리글 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-402',
  name: '맞는 아이디와 비밀번호로 로그인하면 머리글에 「로그아웃」 버튼이 보인다',
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

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('로그인 화면을 연다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 머리.그려질때까지();
    await verify('로그인 화면이 열려 있다', 경로(page), 로그인화면.주소, { blocker: true });
  });

  await test.step('로그인 화면에서 테스트 계정 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.아이디와비밀번호적기(계정.loginId, 계정.password);
    await 로그인.로그인.click();
    await 머리.로그인.waitFor({ state: 'detached' });
    await 머리.그려질때까지();
    await verify('맞는 아이디와 비밀번호로 로그인하면 머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃.isVisible(), true);
  });
});
