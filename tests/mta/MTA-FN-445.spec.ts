import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-445',
  name: '「마음에 안 듭니다」를 고르고 「다음」을 누르면 신고를 보내지 않고 완료 화면(「이런 것을 보지 않길 원하나요?」)으로 가고 팔로우 해제 · 뮤트 · 차단만 할 수 있다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필을 연다', async () => {
    await 프로필열기(driver, 'promo_lee');
    await verify('promo_lee 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('promo_lee 프로필 메뉴에서 신고를 연다', async () => {
    await 신고.프로필에서열기();
    await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
  });
  await test.step('promo_lee 신고에서 「마음에 안 듭니다」를 고르고 「다음」을 누른다', async () => {
    await 신고.이유고르기('마음에 안 듭니다');
    await 신고.다음누르기();
    const 화면 = await verify('완료 화면 「이런 것을 보지 않길 원하나요?」가 보인다', await 신고.글자보이나('이런 것을 보지 않길 원하나요?', 15_000), true);
    const 뮤트 = await verify('뮤트 줄이 보인다', await 신고.동작줄보이나('뮤트줄'), true);
    const 차단 = await verify('차단 줄이 보인다', await 신고.동작줄보이나('차단줄'), true);
    await verify('「마음에 안 듭니다」를 고르고 「다음」을 누르면 신고를 보내지 않고 완료 화면(「이런 것을 보지 않길 원하나요?」)으로 가고 팔로우 해제 · 뮤트 · 차단만 할 수 있다', 화면 && 뮤트 && 차단, true);
  }, { capture: true });
});
