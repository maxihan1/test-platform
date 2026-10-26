import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-135',
  name: '없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: z.object({
    없는글번호: z.number().int().describe('열어 볼 글 번호 — 서버에 없는 큰 번호').default(9999999),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('게시글 상세 화면을 열 준비를 한다', async () => {
    await 안내창막기(page);
    await page.goto('/board');
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
  });

  await test.step('없는 글 번호로 게시글 상세를 연다', async () => {
    await 상세.열기(params.없는글번호);
    await verify('없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.isVisible(), true);
  });

  await test.step('일회용 회원이 올렸다 지운 글 번호를 만든다', async () => {
    const 글 = await 일회용회원의글만들기(page.request);
    await 글지우기(page.request, 글.번호);
    await 상세.열기(글.번호);
    await 머리.그려질때까지();
    await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('지운 글 번호로 게시글 상세를 연다', async () => {
    await verify('삭제된 글 번호로 들어가도 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글안내.isVisible(), true);
  });
});
