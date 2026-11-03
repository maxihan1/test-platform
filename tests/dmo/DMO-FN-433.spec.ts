import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 관리자로그인 } from './helpers/account.helper.js';
import { 글자수맞추기 } from './helpers/board-flow.helper.js';
import { 운영게시판화면 } from './pages/ops-board.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-433',
  name: '공지 제목 칸에 50자를 적으면 50자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있고 「공지 쓰기」 창이 열려 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    titleFit: z.number().int().describe('제목 칸에 적을 글자 수 — 1~50자').default(50),
    titleOver: z.number().int().describe('제목 칸에 적을 글자 수 — 51자 이상').default(51),
  }),
  expected: null,
  techniques: ['경계값 분석'],
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

  await test.step('제목 칸에 50자를 적는다', async () => {
    await 화면.제목칸.fill(글자수맞추기(params.titleFit));
    await verify('공지 제목 칸에 50자를 적으면 50자가 다 들어간다', (await 화면.제목칸.inputValue()).length, params.titleFit);
  });

  await test.step('제목 칸에 51자를 적는다', async () => {
    await 화면.제목칸.fill(글자수맞추기(params.titleOver));
    await verify('공지 제목 칸에 51자를 적으면 50자까지만 들어간다', (await 화면.제목칸.inputValue()).length, 50);
  });
});
