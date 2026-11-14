import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-415',
  name: '관리자가 글의 「자세히」를 누르면 「중재 화면에서 이 게시물 열기」가 보인다',
  precondition: ['관리자로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 카드 = new 글카드목록(page);

  await test.step('관리자로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.adminId, params.adminPassword);
    await 프로필.열기('hana_photo');
    await 카드.카드보이기('4.7 의 인용');
    await verify('hana_photo 글 카드가 보인다', await 카드.카드('4.7 의 인용').isVisible(), true, { blocker: true });
  });

  await test.step('관리자로 hana_photo 글의 「자세히」를 누른다', async () => {
    await 카드.자세히열기('4.7 의 인용');
    await verify('관리자가 글의 「자세히」를 누르면 「중재 화면에서 이 게시물 열기」가 보인다', await 카드.펼침.항목('중재 화면에서 이 게시물 열기').isVisible(), true);
  });
});
