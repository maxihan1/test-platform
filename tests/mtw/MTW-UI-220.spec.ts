import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 뮤트창 } from './pages/mute-dialog.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-220',
  name: '글 메뉴 「뮤트」를 누르면 「사용자를 뮤트할까요?」 창이 뜬다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 창 = new 뮤트창(page);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기('hana_photo');
    await 프로필.첫글그려질때까지();
    await verify('프로필에 글 목록이 보인다', await 프로필.글목록.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('hana_photo 글 「자세히」의 「뮤트」를 누른다', async () => {
      await 프로필.첫글메뉴열기();
      await 프로필.펼침.항목(/뮤트$/).click();
      const 떴다 = await 창.제목.filter({ hasText: '사용자를 뮤트할까요?' }).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('글 메뉴 「뮤트」를 누르면 「사용자를 뮤트할까요?」 창이 뜬다', 떴다, true);
    });

    await test.step('뮤트 창의 「옵션 보기」를 누른다', async () => {
      await 창.옵션열기();
      await verify('뮤트 기간은 「내가 뮤트를 해제하기 전까지」가 골라져 있다', await 창.기간없음.isChecked(), true);
      await verify('「알림에서 숨기기」가 체크되어 있다', await 창.알림숨기기.isChecked(), true);
    });
  } finally {
    if ((await 창.창.count()) > 0) await 창.닫기();
  }
});
