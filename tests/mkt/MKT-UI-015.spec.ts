import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-015',
  name: '1:1 문의 화면에 유형 선택 상자 · 입력칸 · 첨부 파일 칸 · 「답변 알림 이메일 받기」 체크박스가 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 문의화면(page);
  const 머리 = new 머리글(page);
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await 화면.내역제목().waitFor();
    await 머리.로그아웃버튼().waitFor();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
    await verify(
      '문의 유형 「주문」 「배송」 「상품」 「기타」를 고르는 선택 상자가 보인다',
      [await 화면.유형선택().isVisible(), await 화면.고를수있는유형들()],
      [true, ['주문', '배송', '상품', '기타']],
    );
    await verify(
      '제목 · 내용 입력칸과 첨부 파일 입력칸이 보인다',
      [await 화면.제목칸().isVisible(), await 화면.내용칸().isVisible(), await 화면.첨부칸().isVisible()],
      [true, true, true],
    );
    await verify('「답변 알림 이메일 받기」 체크박스가 보인다', await 화면.답변알림체크().isVisible(), true);
  });
});
