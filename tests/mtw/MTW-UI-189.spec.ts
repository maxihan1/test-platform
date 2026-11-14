import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-189',
  name: '남의 프로필 「⋯」를 누르면 「링크 복사하기」 · 「멘션」 · 「개인 멘션」 · 「계정 뮤트」 · 「계정 차단」 · 「계정 신고」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await verify('프로필 머리에 「⋯」 버튼이 보인다', await 프로필.더보기.isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필의 「⋯」를 누른다', async () => {
    await 프로필.더보기열기();
    const 복사 = await verify('「링크 복사하기」가 보인다', await 프로필.펼침.항목('링크 복사하기').isVisible(), true);
    const 멘션 = await verify('「멘션」이 보인다', await 프로필.펼침.항목(/^멘션$/).isVisible(), true);
    const 개인멘션 = await verify('「개인 멘션」이 보인다', await 프로필.펼침.항목(/^개인 멘션$/).isVisible(), true);
    const 뮤트 = await verify('「계정 뮤트」가 보인다', await 프로필.펼침.항목(/^계정 뮤트$/).isVisible(), true);
    const 차단 = await verify('「계정 차단」이 보인다', await 프로필.펼침.항목(/^계정 차단$/).isVisible(), true);
    const 신고 = await verify('「계정 신고」가 보인다', await 프로필.펼침.항목(/^계정 신고$/).isVisible(), true);
    await verify('남의 프로필 「⋯」를 누르면 「링크 복사하기」 · 「멘션」 · 「개인 멘션」 · 「계정 뮤트」 · 「계정 차단」 · 「계정 신고」가 보인다', 복사 && 멘션 && 개인멘션 && 뮤트 && 차단 && 신고, true);
  });
});
