import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-332',
  name: '내가 팔로우 중인 사람 프로필 메뉴에 「목록에서 추가 또는 제거」 · 「Feature on my profile」 · 「부스트 숨기기」가 더 보인다',
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
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필 상단 메뉴를 연다', async () => {
    await 프로필열기(driver, 'hana_photo');
    const 항목 = await 프로필.메뉴항목들();
    const 판정1 = await verify('프로필 메뉴에 「목록에서 추가 또는 제거」가 보인다', 항목.includes('목록에서 추가 또는 제거'), true);
    const 판정2 = await verify('프로필 메뉴에 「Feature on my profile」이 보인다', 항목.includes('Feature on my profile'), true);
    const 판정3 = await verify('프로필 메뉴에 「부스트 숨기기」가 보인다', 항목.includes('부스트 숨기기'), true);
    await verify('내가 팔로우 중인 사람 프로필 메뉴에 「목록에서 추가 또는 제거」 · 「Feature on my profile」 · 「부스트 숨기기」가 더 보인다', 판정1 && 판정2 && 판정3, true);
  }, { capture: true });
});
