import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 글자있나, 확인창이면취소하기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-301',
  name: '해시태그 관리 해제 버튼을 누르면 「<#태그> 님을 언팔로우 할까요?」(「팔로우 해제」 · 「취소」) 창이 뜬다',
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
  const 관리 = new 해시태그관리화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('해시태그 관리 줄의 해제 버튼을 누른다', async () => {
    try {
      await 관리.열기();
      await 관리.해제버튼누르기();
      const 판정1 = await verify('확인 창 「<#태그> 님을 언팔로우 할까요?」가 보인다', await 문구가보이나(driver, '<#태그> 님을 언팔로우 할까요?'), true);
      const 판정2 = await verify('확인 창에 「팔로우 해제」 버튼이 보인다', await 글자있나(driver, '팔로우 해제'), true);
      const 판정3 = await verify('확인 창에 「취소」 버튼이 보인다', await 글자있나(driver, '취소'), true);
      await verify('해시태그 관리 해제 버튼을 누르면 「<#태그> 님을 언팔로우 할까요?」(「팔로우 해제」 · 「취소」) 창이 뜬다', 판정1 && 판정2 && 판정3, true);
    } finally {
      await 확인창이면취소하기(driver);
    }
  }, { capture: true });
});
