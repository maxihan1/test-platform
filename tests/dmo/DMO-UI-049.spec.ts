import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 문의만들기, 정리함, 회원마당열기, type 만든문의 } from './helpers/board-flow.helper.js';
import { 문의관리화면 } from './pages/inquiries.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-049',
  name: '문의 관리 화면 표에 등록일 · 아이디 · 유형 · 제목 · 상태 열이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 답변 대기 문의가 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 정리 = new 정리함();
  const 화면 = new 문의관리화면(page);
  const 틀 = new 운영틀(page);
  let 문의!: 만든문의;
  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    });

    await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
      await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('일회용 회원이 문의를 남겨 둔다', async () => {
      const 마당 = await 회원마당열기(page, request, 정리);
      문의 = await 문의만들기(마당, page, 정리);
    });

    await test.step('/ops/inquiries 를 연다', async () => {
      await 화면.열기();
      await verify('문의 관리 화면에 답변 대기 문의 줄이 보인다', await 화면.줄(문의.title).isVisible(), true, { blocker: true });
      const 등록일 = await verify('「등록일」 열이 보인다', await 화면.열머리('등록일').isVisible(), true);
      const 아이디 = await verify('「아이디」 열이 보인다', await 화면.열머리('아이디').isVisible(), true);
      const 유형 = await verify('「유형」 열이 보인다', await 화면.열머리('유형').isVisible(), true);
      const 제목 = await verify('「제목」 열이 보인다', await 화면.열머리('제목').isVisible(), true);
      const 상태 = await verify('「상태」 열이 보인다', await 화면.열머리('상태').isVisible(), true);
      await verify('문의 관리 화면 표에 등록일 · 아이디 · 유형 · 제목 · 상태 열이 보인다', 등록일 && 아이디 && 유형 && 제목 && 상태, true);
    });
  } finally {
    await 정리.비우기();
  }
});
