import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 필터지우기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-424',
  name: '「이 게시물을 필터」로 새 필터를 만들면 「필터 추가됨!」이 보인다',
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
  const 필터이름 = 표식('flt');

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 카드.카드보이기('4.7 의 인용');
    await verify('hana_photo 글 카드가 보인다', await 카드.카드('4.7 의 인용').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 글의 「이 게시물을 필터」에서 새 필터를 만든다', async () => {
      await 카드.필터창열기('4.7 의 인용');
      await 카드.새필터만들기(필터이름);
      const 떴다 = await 카드.필터추가됨.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「이 게시물을 필터」로 새 필터를 만들면 「필터 추가됨!」이 보인다', 떴다, true);
    });
  } finally {
    await 필터지우기API(page, 필터이름);
  }
});
