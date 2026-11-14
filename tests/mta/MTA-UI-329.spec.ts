import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 글자있나 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 팔로워목록화면 } from './pages/follow-list.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-329',
  name: '프로필 「Followers」 · 「Following」 숫자를 누르면 팔로워 · 팔로잉 목록(계정 줄 + 팔로우 버튼)이 열리고 끝까지 내리면 다음 쪽을 불러온다',
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
  const 목록 = new 팔로워목록화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필에서 「Followers」를 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 프로필.팔로워누르기();
    const 판정1 = await verify('「Followers」 숫자를 누르면 팔로워 목록이 열린다', await 목록.떴나(), true);
    const 판정2 = await verify('목록에 계정 줄이 보인다', await 목록.계정줄있나(), true);
    const 판정3 = await verify('목록의 계정 줄에 팔로우 버튼이 보인다', (await 글자있나(driver, '팔로우', 3_000)) || (await 글자있나(driver, '팔로우 해제', 3_000)), true);
    await verify('프로필 「Followers」 · 「Following」 숫자를 누르면 팔로워 · 팔로잉 목록(계정 줄 + 팔로우 버튼)이 열리고 끝까지 내리면 다음 쪽을 불러온다', 판정1 && 판정2 && 판정3, true);
  }, { capture: true });
});
