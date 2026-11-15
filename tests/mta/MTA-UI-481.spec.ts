import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션화면 } from './pages/collection.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-481',
  name: '컬렉션 메뉴에 「공유」 · 「브라우저에서 열기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 컬렉션 = new 컬렉션화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('컬렉션 화면 메뉴를 연다', async () => {
    await driver.$(홈.탭.프로필).click();
    await verify('내 프로필 화면이 열린다', await 프로필.그려질때까지(), true, { blocker: true });
    await driver.$(프로필.탭('추천')).click();
    await 컬렉션.열기('좋아하는 사진가');
    await verify('컬렉션 화면이 열린다', await 컬렉션.글자가뜰때까지('by @qa_user1', 15_000), true, { blocker: true });
    await 컬렉션.메뉴열기();
    const 공유 = await verify('「공유」가 보인다', await 컬렉션.메뉴.뜰때까지('공유'), true);
    const 브라우저 = await verify('「브라우저에서 열기」가 보인다', await 컬렉션.메뉴.뜰때까지('브라우저에서 열기'), true);
    await verify('컬렉션 메뉴에 「공유」 · 「브라우저에서 열기」가 보인다', 공유 && 브라우저, true);
  });
});
