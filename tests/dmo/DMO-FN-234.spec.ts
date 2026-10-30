import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글자수맞추기 } from './helpers/board-flow.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-234',
  name: '공지 쓰기 규칙에 맞지 않으면 창이 열린 채 창 안에 이유가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 「공지 쓰기」 창이 열려 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, params }) => {
  const 화면 = new 운영게시판화면(page);
  const 틀 = new 운영틀(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 운영게시판화면.주소);
  });

  await test.step('운영 화면에서 로그인 상태를 확인한다', async () => {
    await verify('머리줄에 「로그아웃」 버튼이 보인다', await 틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('「공지 쓰기」 창을 연다', async () => {
    await 화면.공지창열기();
  });

  await test.step('「공지 쓰기」 창을 확인한다', async () => {
    await verify('「공지 쓰기」 창에 제목 칸이 보인다', await 화면.제목칸.isVisible(), true, { blocker: true });
  });

  await test.step('제목을 비운 채 「등록」을 누른다', async () => {
    await 화면.공지적기('', 글자수맞추기(20));
    await 화면.등록누르고안내기다리기();
    const 열림 = await verify('창이 열려 있다', await 화면.창.isVisible(), true);
    const 이유 = await verify('창 안에 이유가 보인다', await 화면.안내.isVisible(), true);
    await verify('공지 쓰기 규칙에 맞지 않으면 창이 열린 채 창 안에 이유가 보인다', 열림 && 이유, true);
  });
});
