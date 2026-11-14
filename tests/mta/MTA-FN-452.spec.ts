import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트시트 } from './pages/mute-sheet.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-452',
  name: '이미 뮤트했거나 팔로우하지 않는 계정이면 신고 완료 화면에서 해당 줄만 숨겨진다',
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
  await test.step('noisy_cho 프로필을 연다', async () => {
    await 프로필열기(driver, 'noisy_cho');
    await verify('noisy_cho 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('noisy_cho 프로필 메뉴에서 신고를 열어 「마음에 안 듭니다」를 고른다', async () => {
    await 신고.프로필에서열기();
    await verify('신고 이유 목록이 보인다', await 신고.글자보이나('마음에 안 듭니다', 15_000), true, { blocker: true });
  });

  await test.step('뮤트한 noisy_cho 신고에서 「마음에 안 듭니다」를 고르고 「다음」을 누른다', async () => {
    await 신고.이유고르기('마음에 안 듭니다');
    await 신고.다음누르기();
    const 화면 = await verify('신고 완료 화면이 보인다', await 신고.완료화면떴나(), true);
    const 차단 = await verify('차단 줄은 그대로 보인다', await 신고.동작줄보이나('차단줄'), true);
    const 뮤트 = await verify('뮤트 줄이 보이지 않는다', !(await 신고.동작줄보이나('뮤트줄')), true);
    await verify('이미 뮤트했거나 팔로우하지 않는 계정이면 신고 완료 화면에서 해당 줄만 숨겨진다', 화면 && 차단 && 뮤트, true);
  }, { capture: true });
});
