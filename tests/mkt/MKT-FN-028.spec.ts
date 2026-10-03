import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-028',
  name: '로그아웃 확인 모달이 열려 있는 동안 뒤 화면이 스크롤되지 않고 닫히면 연 버튼으로 초점이 돌아온다',
  precondition: ['회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    overflow: z.string().describe('모달이 열린 동안 본문 넘침 값').default('hidden'),
    focused: z.boolean().describe('연 버튼에 초점이 있는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 머리 = new 머리글(page);
  const 화면 = new 로그인화면(page);
  const 확인창 = new 모달(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
    await new 주문내역화면(page).열기();
  });

  await test.step('머리글에서 「로그아웃」을 눌러 확인 모달을 연다', async () => {
    await 머리.로그아웃.click();
    await 확인창.바닥버튼('확인', '취소').waitFor();
    await verify('모달이 열려 있는 동안 뒤 화면은 스크롤되지 않는다', await 화면.본문넘침(), expected.overflow);
  });

  await test.step('확인 모달에서 「취소」를 누른다', async () => {
    await 확인창.바닥버튼('확인', '취소').click();
    await 확인창.대화상자('확인').waitFor({ state: 'hidden' });
    await verify('모달이 닫히면 모달을 연 버튼으로 초점이 돌아온다', await 화면.초점이있나(머리.로그아웃), expected.focused);
  });
});
