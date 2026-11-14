import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-132',
  name: '글 카드 작업 막대에 「답장」 · 「부스트」 · 「좋아요」 · 「북마크」 · 「자세히」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 카드 = new 글카드목록(page);
  const 글표식 = 표식('bar');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 홈에 새 글을 올려 둔다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    글번호 = (await 글쓰기API(page, { status: `작업 막대 확인 ${글표식}`, visibility: 'public' })).id;
    await 홈.열기();
    await verify('홈에 새 글 카드가 보인다', await 카드.카드뜰때까지(글표식), true, { blocker: true });
  });

  try {
    await test.step('홈을 연다', async () => {
      const 답장 = await verify('글 카드 작업 막대에 「답장」이 보인다', await 카드.답장(글표식).isVisible(), true);
      const 부스트 = await verify('글 카드 작업 막대에 「부스트」가 보인다', await 카드.부스트(글표식).isVisible(), true);
      const 좋아요 = await verify('글 카드 작업 막대에 「좋아요」가 보인다', await 카드.좋아요(글표식).isVisible(), true);
      const 북마크 = await verify('글 카드 작업 막대에 「북마크」가 보인다', await 카드.북마크(글표식).isVisible(), true);
      const 자세히 = await verify('글 카드 작업 막대에 「자세히」가 보인다', await 카드.자세히(글표식).isVisible(), true);
      await verify('글 카드 작업 막대에 「답장」 · 「부스트」 · 「좋아요」 · 「북마크」 · 「자세히」가 보인다', 답장 && 부스트 && 좋아요 && 북마크 && 자세히, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
