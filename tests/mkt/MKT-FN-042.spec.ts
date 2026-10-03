import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-042',
  name: '맞는 아이디와 비밀번호로 로그인하면 홈으로 가고 확인 창에서 확인하면 로그아웃된다',
  precondition: [
    '비회원이다',
    '로그인할 수 있는 회원 계정이 있다',
    '아이디와 비밀번호를 적어 두었다',
    '회원 계정으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    homePath: z.string().describe('홈 화면 경로').default('/'),
    loggedOut: z.string().describe('로그아웃 뒤 화면 경로와 상태').default('/ 로그아웃됨'),
    shown: z.boolean().describe('보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 내역 = new 주문내역화면(page);
  const 확인창 = new 모달(page);
  const 비밀번호 = params.password ?? '';

  await test.step('로그인 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('로그인 화면에서 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 화면.입력한다(params.loginId, 비밀번호);
    await 화면.로그인버튼.click();
    await 머리.로그아웃.waitFor();
    await verify('아이디와 비밀번호가 맞으면 로그인되고 홈으로 간다', new URL(page.url()).pathname, expected.homePath);
  });

  await test.step('머리글에서 「로그아웃」을 누른다', async () => {
    await 내역.열기();
    await 머리.로그아웃.click();
    await 확인창.바닥버튼('확인', '확인').waitFor();
    await verify('「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다', await 화면.로그아웃확인문구.isVisible(), expected.shown);
  });

  await test.step('확인 창에서 「확인」을 누른다', async () => {
    await 확인창.바닥버튼('확인', '확인').click();
    await 머리.로그인링크.waitFor();
    const 상태 = (await 머리.로그아웃.isVisible()) ? '로그인 상태' : '로그아웃됨';
    await verify('확인 창에서 「확인」을 누르면 로그아웃되어 홈으로 간다', `${new URL(page.url()).pathname} ${상태}`, expected.loggedOut);
  });

  await test.step('비밀번호 칸에서 Enter 를 친다', async () => {
    await 화면.열기();
    await 화면.입력한다(params.loginId, 비밀번호);
    await 화면.비밀번호.press('Enter');
    await 머리.이름.waitFor();
    await verify('비밀번호 칸에서 Enter 를 치면 로그인 버튼을 누른 것과 같이 로그인된다', await 머리.로그아웃.isVisible(), expected.shown);
  });
});
