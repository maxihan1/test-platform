import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정창열기, 컬렉션번호API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션상세화면 } from './pages/collection-detail.page.js';
import { 신고창 } from './pages/report-dialog.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-224',
  name: '글 메뉴 「신고하기」를 누르면 신고 창이 뜬다',
  precondition: ['일반 회원으로 로그인해 있다', '두 번째 사용자로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 신고 = new 신고창(page);
  let 컬렉션번호 = '';
  const 두번째창 = 계정창열기(page, params.secondId, params.secondPassword);
  두번째창.catch(() => undefined);

  await test.step('일반 회원으로 로그인하고 hana_photo 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    컬렉션번호 = await 컬렉션번호API(page, '좋아하는 사진가');
    await 프로필.열기('hana_photo');
    await 프로필.첫글그려질때까지();
    await verify('프로필에 글 목록이 보인다', await 프로필.글목록.isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 글 「자세히」의 「@hana_photo 신고하기」를 누른다', async () => {
    await 프로필.첫글메뉴열기();
    await 프로필.펼침.항목('@hana_photo 신고하기').click();
    const 떴다 = await 신고.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('글 메뉴 「신고하기」를 누르면 신고 창이 뜬다', 떴다, true);
    await 신고.닫기누르기();
  });

  await test.step('hana_photo 프로필 「⋯」의 「계정 신고」를 누른다', async () => {
    await 프로필.더보기열기();
    await 프로필.펼침.항목(/^계정 신고$/).click();
    const 떴다 = await 신고.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('프로필 「⋯」의 「계정 신고」도 신고 창을 띄운다', 떴다, true);
    await 신고.닫기누르기();
  });

  try {
    await test.step('두 번째 사용자로 일반 회원 컬렉션의 「이 컬렉션 신고」를 누른다', async () => {
      const 창 = await 두번째창;
      const 둘째상세 = new 컬렉션상세화면(창.page);
      const 둘째신고 = new 신고창(창.page);
      await 둘째상세.열기(컬렉션번호);
      await 둘째상세.메뉴열기();
      await 둘째상세.펼침.항목('이 컬렉션 신고').click();
      const 떴다 = await 둘째신고.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('컬렉션의 「이 컬렉션 신고」도 신고 창을 띄운다', 떴다, true);
      await 둘째신고.닫기누르기();
    });
  } finally {
    await 두번째창.then((창) => 창.창묶음.close(), () => undefined);
  }
});
