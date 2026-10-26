import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 글지우기, 댓글달기 } from './helpers/data.helper.js';
import { 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-149',
  name: '댓글을 고쳐 저장하면 그 댓글에 「(수정됨)」이 붙는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    고친댓글: z.string().min(1).describe('고쳐 저장할 댓글 — 1자 이상 300자 이하').default('이렇게 고친 댓글입니다'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 글번호 = 0;

  try {
    await test.step('일회용 회원이 댓글을 단 내 글의 상세 화면을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request);
      글번호 = 글.번호;
      await 댓글달기(page.request, 글번호, '고치기 전 내 댓글입니다');
      await 안내창막기(page);
      await 상세.열기(글번호);
      await 상세.댓글그려질때까지();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('내 댓글이 보인다', await 상세.댓글줄('고치기 전 내 댓글입니다').count(), 1, { blocker: true });
    });

    await test.step('내 댓글을 고쳐 「저장」을 누른다', async () => {
      const 줄 = 상세.댓글줄('고치기 전 내 댓글입니다');
      await 상세.댓글수정버튼(줄).click();
      await 상세.수정칸(줄).fill(params.고친댓글);
      await 상세.댓글저장버튼(줄).click();
      await 상세.댓글줄(params.고친댓글).first().waitFor();
      await verify('댓글을 고쳐 저장하면 그 댓글에 「(수정됨)」이 붙는다', await 상세.댓글줄(params.고친댓글).getByText('(수정됨)', { exact: true }).isVisible(), true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
