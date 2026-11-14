import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 서버정보화면 } from './pages/server-about.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-411',
  name: '「이 서버에 대해서」(부제 「미리보기, 규칙,」)를 누르면 탭 「<서버>에 대해」 · 「규칙」이 보인다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 정보 = new 서버정보화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  await test.step('계정 설정에서 「이 서버에 대해서」를 누른다', async () => {
    const 부제 = await verify('「이 서버에 대해서」 부제가 「미리보기, 규칙,」다', await 계정설정.부제글('이 서버에 대해서'), '미리보기, 규칙,');
    await 계정설정.줄누르기('이 서버에 대해서');
    await verify('서버 정보 화면이 열린다', await 정보.떴나(), true);
    const 소개탭 = await verify('탭 「<서버>에 대해」가 보인다', await 정보.글보이나('<서버>에 대해'), true);
    const 규칙탭 = await verify('탭 「규칙」이 보인다', await 정보.글자보이나('규칙'), true);
    await verify('「이 서버에 대해서」(부제 「미리보기, 규칙,」)를 누르면 탭 「<서버>에 대해」 · 「규칙」이 보인다', 부제 && 소개탭 && 규칙탭, true);
  }, { capture: true });
});
