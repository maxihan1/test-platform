import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-135',
  name: '글의 「자세히」를 누르면 「상세 정보 표시」 · 「게시물 링크 복사」가 보인다',
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
  const 글표식 = 표식('more');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 홈에 새 글을 올려 둔다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    글번호 = (await 글쓰기API(page, { status: `자세히 메뉴 확인 ${글표식}`, visibility: 'public' })).id;
    await 홈.열기();
    await verify('홈에 새 글 카드가 보인다', await 카드.카드뜰때까지(글표식), true, { blocker: true });
  });

  try {
    await test.step('글의 「자세히」를 누른다', async () => {
      await 카드.자세히열기(글표식);
      const 상세 = await verify('「상세 정보 표시」가 보인다', await 카드.펼침.항목('상세 정보 표시').isVisible(), true);
      const 링크 = await verify('「게시물 링크 복사」가 보인다', await 카드.펼침.항목('게시물 링크 복사').isVisible(), true);
      await verify('글의 「자세히」를 누르면 「상세 정보 표시」 · 「게시물 링크 복사」가 보인다', 상세 && 링크, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
