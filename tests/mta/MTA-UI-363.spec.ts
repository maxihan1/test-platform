import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필메뉴 } from './pages/profile-menu.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-363',
  name: '내 프로필 메뉴 「보관함」 · 「즐겨찾기」를 열면 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다',
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
  const 프로필 = new 프로필메뉴(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('내 프로필 메뉴에서 「보관함」과 「즐겨찾기」를 연다', async () => {
    await verify('내 프로필이 열린다', await 프로필.내프로필열기(), true);
    await 프로필.고르기('보관함');
    const 보관 = await verify('「보관함」 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다', await 프로필.글보이나('당신이 저장한 게시물은 오직 당신에게만 보입니다.'), true);
    await 프로필.뒤로가기();
    await 프로필.고르기('즐겨찾기');
    const 즐겨 = await verify('「즐겨찾기」 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다', await 프로필.글보이나('당신이 저장한 게시물은 오직 당신에게만 보입니다.'), true);
    await verify('내 프로필 메뉴 「보관함」 · 「즐겨찾기」를 열면 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다', 보관 && 즐겨, true);
  }, { capture: true });
});
