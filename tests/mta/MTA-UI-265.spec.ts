import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-265',
  name: '알림 제외 조건 창(제목 「알림 제외 조건…」)에 「내가 팔로우하지 않는 사람들」(부제 「내가 직접 승인하지 않는 한」) · 「나를 팔로우하지 않는 사람들」(「나를 팔로우한 지 3일 이하인 사람 포함」) · 「새로운 계정」(「지난 30일 사이에 가입함」) · 「요청하지 않은 개인 멘션」(「내가 남긴 멘션에 단 답글이거나 내가 팔로우한 것이 아닌 이상 필터링됩니다」) 체크와 「저장」이 보인다',
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
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('알림 화면에서 「알림 제외 조건…」을 누른다', async () => {
    try {
      await 알림.열기();
      await 알림.제외조건열기();
      const 판정1 = await verify('알림 제외 조건 창 제목 「알림 제외 조건…」이 보인다', await 문구가보이나(driver, '알림 제외 조건…'), true);
      const 판정2 = await verify('「내가 팔로우하지 않는 사람들」 글자가 보인다', await 문구가보이나(driver, '내가 팔로우하지 않는 사람들'), true);
      const 판정3 = await verify('「내가 직접 승인하지 않는 한」 글자가 보인다', await 문구가보이나(driver, '내가 직접 승인하지 않는 한'), true);
      const 판정4 = await verify('「나를 팔로우하지 않는 사람들」 글자가 보인다', await 문구가보이나(driver, '나를 팔로우하지 않는 사람들'), true);
      const 판정5 = await verify('「나를 팔로우한 지 3일 이하인 사람 포함」 글자가 보인다', await 문구가보이나(driver, '나를 팔로우한 지 3일 이하인 사람 포함'), true);
      const 판정6 = await verify('「새로운 계정」 글자가 보인다', await 문구가보이나(driver, '새로운 계정'), true);
      const 판정7 = await verify('「지난 30일 사이에 가입함」 글자가 보인다', await 문구가보이나(driver, '지난 30일 사이에 가입함'), true);
      const 판정8 = await verify('「요청하지 않은 개인 멘션」 글자가 보인다', await 문구가보이나(driver, '요청하지 않은 개인 멘션'), true);
      const 판정9 = await verify('「내가 남긴 멘션에 단 답글이거나 내가 팔로우한 것이 아닌 이상 필터링됩니다」 글자가 보인다', await 문구가보이나(driver, '내가 남긴 멘션에 단 답글이거나 내가 팔로우한 것이 아닌 이상 필터링됩니다'), true);
      const 판정10 = await verify('「저장」 글자가 보인다', await 문구가보이나(driver, '저장'), true);
      await verify('알림 제외 조건 창(제목 「알림 제외 조건…」)에 「내가 팔로우하지 않는 사람들」(부제 「내가 직접 승인하지 않는 한」) · 「나를 팔로우하지 않는 사람들」(「나를 팔로우한 지 3일 이하인 사람 포함」) · 「새로운 계정」(「지난 30일 사이에 가입함」) · 「요청하지 않은 개인 멘션」(「내가 남긴 멘션에 단 답글이거나 내가 팔로우한 것이 아닌 이상 필터링됩니다」) 체크와 「저장」이 보인다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5 && 판정6 && 판정7 && 판정8 && 판정9 && 판정10, true);
    } finally {
      await 뒤로(driver);
    }
  }, { capture: true });
});
