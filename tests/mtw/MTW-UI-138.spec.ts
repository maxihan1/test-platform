import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-138',
  name: '남의 글 「자세히」 메뉴에 「@hana_photo 님에게 멘션」 · 「개인 멘션」 · 「뮤트」 · 「차단」 · 「이 게시물을 필터」 · 「@hana_photo 신고하기」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 카드 = new 글카드목록(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 카드.카드보이기('4.7 의 인용');
    await verify('hana_photo 글 카드가 보인다', await 카드.카드('4.7 의 인용').isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 글의 「자세히」를 누른다', async () => {
    await 카드.자세히열기('4.7 의 인용');
    const 멘션 = await verify('「@hana_photo 님에게 멘션」이 보인다', await 카드.펼침.항목('@hana_photo 님에게 멘션').isVisible(), true);
    const 개인 = await verify('「개인 멘션」이 보인다', await 카드.펼침.항목('개인 멘션').isVisible(), true);
    const 뮤트 = await verify('「뮤트」가 보인다', await 카드.펼침.항목('뮤트').isVisible(), true);
    const 차단 = await verify('「차단」이 보인다', await 카드.펼침.항목('차단').isVisible(), true);
    const 필터 = await verify('「이 게시물을 필터」가 보인다', await 카드.펼침.항목('이 게시물을 필터').isVisible(), true);
    const 신고 = await verify('「@hana_photo 신고하기」가 보인다', await 카드.펼침.항목('@hana_photo 신고하기').isVisible(), true);
    await verify(
      '남의 글 「자세히」 메뉴에 「@hana_photo 님에게 멘션」 · 「개인 멘션」 · 「뮤트」 · 「차단」 · 「이 게시물을 필터」 · 「@hana_photo 신고하기」가 보인다',
      멘션 && 개인 && 뮤트 && 차단 && 필터 && 신고,
      true,
    );
  });
});
