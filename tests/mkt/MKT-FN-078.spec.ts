import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 글쓰기 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-078',
  name: '내용을 쓰다가 다른 화면으로 가거나 창을 닫으려 하면 브라우저의 「사이트에서 나가시겠습니까?」 확인이 뜬다',
  platforms: ['desktop'],
  precondition: ['일반 회원이 로그인해 있다', '글쓰기 화면에 내용을 적었다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
    title: z.string().min(1).describe('적어 두는 제목').default('나가기 확인 시험용 제목'),
  }),
  expected: z.object({
    dialogType: z.string().describe('뜬 확인 창 종류').default('beforeunload'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 쓰기 = new 글쓰기(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 로그인.로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await 머리.로그아웃.waitFor();
    await verify('일반 회원이 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기 화면에 내용을 적는다', async () => {
    await 쓰기.열기();
    await 쓰기.제목칸.click();
    await 쓰기.제목칸.fill(params.title);
  });

  await test.step('다른 화면으로 가려고 창을 닫는다', async () => {
    const 대기 = page.waitForEvent('dialog');
    await page.close({ runBeforeUnload: true });
    const 확인창 = await 대기;
    const 종류 = 확인창.type();
    await 확인창.dismiss();
    await verify(
      '내용을 쓰다가 다른 화면으로 가거나 창을 닫으려 하면 브라우저의 「사이트에서 나가시겠습니까?」 확인이 뜬다',
      종류,
      expected.dialogType,
    );
  });
});
