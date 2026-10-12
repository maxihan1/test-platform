import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디, 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';
import { 경로, 보이는이름들 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-119',
  name: '1:1 문의 화면에 유형 선택 상자 · 제목 입력칸 · 내용 입력칸 · 「등록」 버튼이 보인다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('테스트 계정으로 로그인했는지 확인한다', async () => {
    await verify('테스트 계정으로 로그인해 있다', await 로그인한아이디(page.request), 계정값(params).loginId, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 문의.열기();
    await 문의.제목.waitFor();
    await verify('1:1 문의 화면이 열려 있다', 경로(page), 문의화면.주소, { blocker: true });
    await verify(
      '1:1 문의 화면에 유형 선택 상자 · 제목 입력칸 · 내용 입력칸 · 「등록」 버튼이 보인다',
      await 보이는이름들({ '유형 선택 상자': 문의.유형, '제목 입력칸': 문의.제목칸, '내용 입력칸': 문의.내용칸, '「등록」 버튼': 문의.등록 }),
      '유형 선택 상자, 제목 입력칸, 내용 입력칸, 「등록」 버튼',
    );
  });
});
