import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필메뉴 } from './pages/profile-menu.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-407',
  name: '계정 설정 제목은 @이름@도메인이고 설정 메인의 계정 줄 · 내 프로필 메뉴 「계정 설정」에서 연다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('내 프로필 메뉴에서 「계정 설정」을 누른다', async () => {
    await verify('내 프로필이 열린다', await 프로필.내프로필열기(), true);
    await 프로필.고르기('계정 설정');
    const 열림 = await verify('계정 설정이 열린다', await 계정설정.떴나(), true);
    const 제목 = await verify('계정 설정 제목이 「@이름@도메인」 꼴이다', /^@.+@.+$/.test(await 계정설정.제목글()), true);
    await 홈으로돌아가기(driver);
    await 설정.열기();
    await 설정.계정줄누르기();
    const 줄에서 = await verify('설정의 계정 줄에서도 계정 설정이 열린다', await 계정설정.떴나(), true);
    await verify('계정 설정 제목은 @이름@도메인이고 설정 메인의 계정 줄 · 내 프로필 메뉴 「계정 설정」에서 연다', 열림 && 제목 && 줄에서, true);
  }, { capture: true });
});
