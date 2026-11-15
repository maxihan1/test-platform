import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 확인창 } from './components/dialog.component.js';

export const spec = defineCase({
  tcId: 'MTA-UI-415',
  name: '계정 설정에서 「로그아웃」을 누르면 「로그아웃?」 창에 「로그아웃」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목글: z.string().describe('로그아웃 확인 창 제목').default('로그아웃?'),
    로그아웃글: z.string().describe('로그아웃 확인 창 단추 글').default('로그아웃'),
    취소글: z.string().describe('로그아웃 확인 창 단추 글').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 창 = new 확인창(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('계정 설정에서 「로그아웃」을 누른다', async () => {
    await 설정.줄누르기('로그아웃');
    const 제목 = await verify('확인 창에 「로그아웃?」이 보인다', await 뜰때까지(driver, 창.안의글자(expected.제목글), 10_000), true);
    const 로그아웃 = await verify('확인 창에 「로그아웃」 단추가 보인다', await driver.$(창.확인버튼).getText(), expected.로그아웃글);
    const 취소 = await verify('확인 창에 「취소」 단추가 보인다', await driver.$(창.취소버튼).getText(), expected.취소글);
    await verify('계정 설정에서 「로그아웃」을 누르면 「로그아웃?」 창에 「로그아웃」 · 「취소」가 보인다', 제목 && 로그아웃 && 취소, true);
    await 창.취소();
  });
});
