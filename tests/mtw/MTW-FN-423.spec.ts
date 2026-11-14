import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-423',
  name: '남의 글 「자세히」를 누르면 메뉴에 「고정」이 없다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다', '일반 회원이 쓴 개인 멘션 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 카드 = new 글카드목록(page);
  const 상세 = new 글상세화면(page);
  const 글표식 = 표식('dm');
  let 글번호: string | undefined;
  let 경로 = '';

  await test.step('일반 회원으로 로그인하고 개인 멘션 글을 만든 뒤 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글쓰기API(page, { status: `@qa_user2 개인 멘션 확인 ${글표식}`, visibility: 'direct' });
    글번호 = 글.id;
    경로 = 글경로(글);
    await 프로필.열기('hana_photo');
    await 카드.카드보이기('4.7 의 인용');
    await verify('hana_photo 글 카드가 보인다', await 카드.카드('4.7 의 인용').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 글의 「자세히」를 누른다', async () => {
      await 카드.자세히열기('4.7 의 인용');
      await verify('남의 글 「자세히」를 누르면 메뉴에 「고정」이 없다', await 카드.펼침.항목('고정').count(), 0);
    });

    await test.step('내 개인 멘션 글의 「자세히」를 누른다', async () => {
      await 상세.열기(경로);
      await 상세.자세히열기();
      await verify('내 개인 멘션 글의 「자세히」 메뉴에도 「고정」이 없다', await 상세.펼침.항목('고정').count(), 0);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
