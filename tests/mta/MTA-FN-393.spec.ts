import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 팔로워목록화면 } from './pages/follow-list.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-393',
  name: '아는 팔로워 줄을 누르면 아는 팔로워 목록이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다', '내가 팔로우한 사람 가운데 그 계정을 팔로우하는 사람이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('프로필을 열 계정의 사용자명 — 아는 팔로워 줄이 보이는 시드 계정').default('minjun_dev'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 목록 = new 팔로워목록화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필을 연다', async () => {
    await 프로필열기(driver, params.사용자명);
    await verify('프로필에 아는 팔로워 줄이 보인다', await 뜰때까지(driver, 프로필.아는팔로워, 20_000), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필의 아는 팔로워 줄을 누른다', async () => {
    const 줄글 = await driver.$(프로필.아는팔로워).getText();
    await driver.$(프로필.아는팔로워).click();
    await verify('목록에 계정 줄이 그려진다', await 목록.그려질때까지(), true, { blocker: true });
    const 이름들 = await 목록.글들(목록.이름들);
    const 있음 = await verify('목록에 계정 줄이 하나 이상 있다', 이름들.length > 0, true);
    const 같음 = await verify('목록의 계정이 아는 팔로워 줄에 적힌 사람이다', 이름들.every((이름) => 줄글.includes(이름)), true);
    await verify('아는 팔로워 줄을 누르면 아는 팔로워 목록이 열린다', 있음 && 같음, true);
  });
});
