import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-453',
  name: '신고 완료 화면에서 동작을 마치면 줄이 「<@계정> 님을 팔로우 해제했습니다」 · 「뮤트한-음소거한 <@계정>」 · 「차단한 <@계정>」으로 바뀐다',
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
  const 신고 = new 신고화면(driver);
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
    await test.step('promo_lee 프로필 메뉴에서 신고를 열어 완료 화면까지 간다', async () => {
      await 신고.프로필에서열기();
      await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
      await 신고.이유고르기('마음에 안 듭니다');
      await 신고.다음누르기();
      await verify('신고 완료 화면이 보인다', await 신고.완료화면떴나(), true, { blocker: true });
    });

    await test.step('promo_lee 신고 완료 화면에서 「뮤트」를 누른다', async () => {
      await 신고.뮤트줄누르기();
      중 = true;
      await verify('신고 완료 화면에서 동작을 마치면 줄이 「<@계정> 님을 팔로우 해제했습니다」 · 「뮤트한-음소거한 <@계정>」 · 「차단한 <@계정>」으로 바뀐다', await 신고.글보이나('뮤트한-음소거한 <@계정>'), true);
    }, { capture: true });
  } finally {
    if (중) {
      await 홈으로돌아가기(driver);
      await 프로필열기(driver, 'promo_lee');
      await 시트.해제되어있게하기();
    }
  }
});
