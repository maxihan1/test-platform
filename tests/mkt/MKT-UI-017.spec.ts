import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 머리글 } from './components/header.component.js';
import { 문의 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-017',
  name: '1:1 문의 화면에 입력 항목과 문의 유형이 보인다',
  platforms: ['desktop'],
  precondition: ['회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    types: z.string().describe('문의 유형 이름').default('주문, 배송, 상품, 기타'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 로그인 = new 로그인폼(page);
  const 머리 = new 머리글(page);
  const 폼 = new 문의(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 로그인.로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await 머리.로그아웃.waitFor();
    await verify('회원 계정으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 폼.열기();
    const shown = await Promise.all([폼.유형, 폼.제목칸, 폼.내용칸, 폼.첨부파일, 폼.이메일알림].map((l) => l.isVisible()));
    await verify(
      '1:1 문의 화면에 유형 · 제목 · 내용 · 첨부 파일 · 「답변 알림 이메일 받기」 체크박스가 보인다',
      shown.every(Boolean),
      true,
    );
    await verify('문의 유형에 「주문」 · 「배송」 · 「상품」 · 「기타」가 보인다', (await 폼.유형항목.allInnerTexts()).join(', '), expected.types);
  });
});
