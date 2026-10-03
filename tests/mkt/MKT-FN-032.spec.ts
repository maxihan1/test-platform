import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-032',
  name: '배너 줄의 「아래로」를 누르면 그 배너가 한 칸 아래로 내려간다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다', '홈 배너 3장이 처음 순서다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
  unconfirmed: '기획서와 다름 — 차이 D3: 배너 관리에 기획서에 없는 「위로」 · 「아래로」 버튼이 있다 (작성 요청 5873)',
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);
  const 처음제목 = ['가을 신상 컬렉션', '전자기기 기획전', '책 읽는 계절'];

  await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
    await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('배너 관리 화면에서 배너 순서를 확인한다', async () => {
    await 관리자.열기();
    await 관리자.배너관리를연다();
    await verify('홈 배너 3장이 처음 순서다', await 관리자.배너제목들.allInnerTexts(), 처음제목, { blocker: true });
  });

  await test.step('배너 관리에서 첫 배너의 「아래로」를 누른다', async () => {
    await 관리자.배너아래로(처음제목[0]).click();
    await verify(
      '배너 줄의 「아래로」를 누르면 그 배너가 한 칸 아래로 내려간다',
      await 관리자.배너제목들.allInnerTexts(),
      [처음제목[1], 처음제목[0], 처음제목[2]],
    );
  });
});
