import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 창기록하기 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-350',
  name: '글쓰기 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  창기록하기(page, () => false);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('글쓰기 화면의 「임시 저장」을 누른다', async () => {
    await 쓰기.임시저장.click();
    await verify('글쓰기 화면에서 「임시 저장」을 누르면 토스트 「임시 저장되었습니다」가 보인다', await 알림.글('임시 저장되었습니다').isVisible(), true);
  });

  await test.step('글쓰기 화면의 「취소」를 누른다', async () => {
    await 쓰기.열기();
    await 쓰기.취소.click();
    await 목록.그려질때까지();
    await verify('글쓰기 화면에서 「취소」를 누르면 게시판 목록이 보인다', await 목록.큰제목.isVisible(), true);
  });
});
