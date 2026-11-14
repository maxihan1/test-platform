import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-433',
  name: 'promo_lee 를 뮤트했다가 해제하면 뮤트 해제는 확인 없이 스낵바 「<이름> 뮤트 해제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 시트 = new 뮤트시트(driver);
  let 중 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
  await test.step('promo_lee 프로필을 연다', async () => {
    await 프로필열기(driver, 'promo_lee');
    await verify('promo_lee 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
    await test.step('promo_lee 를 뮤트했다가 해제한다', async () => {
      await 시트.메뉴에서고르기('Mute account');
      await verify('확인 시트 「뮤트」 단추가 보인다', await 시트.단추보이나('뮤트'), true, { blocker: true });
      await 시트.뮤트하기();
      중 = true;
      await 시트.해제하기();
      중 = false;
      await verify('promo_lee 를 뮤트했다가 해제하면 뮤트 해제는 확인 없이 스낵바 「<이름> 뮤트 해제」가 보인다', await 시트.알림이될때까지('<이름> 뮤트 해제'), true);
    }, { capture: true });
  } finally {
    if (중) await 시트.해제되어있게하기();
  }
});
