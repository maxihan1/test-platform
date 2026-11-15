import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지, 칸에적기, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-426',
  name: '목록 구성원 검색에 팔로우하지 않는 사람을 찾으면 그 사람이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    찾을사용자: z.string().min(1).describe('구성원 검색에 적는 사용자명 — 내가 팔로우하지 않는 계정').default('cafe_moon'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('목록 「개발 소식」의 구성원 추가 화면을 연다', async () => {
    await 홈.목록고르기('개발 소식');
    await 뜰때까지(driver, 홈.목록관리, 15_000);
    await driver.$(홈.목록관리).click();
    await verify('목록 편집 화면이 열린다', await 목록.편집그려질때까지(), true, { blocker: true });
    await driver.$(목록.편집줄('리스트 구성원')).click();
    await verify('리스트 구성원 화면의 구성원 추가 버튼이 보인다', await 뜰때까지(driver, 목록.구성원추가, 15_000), true, { blocker: true });
    await driver.$(목록.구성원추가).click();
    await verify('구성원 검색 칸이 보인다', await 뜰때까지(driver, 목록.검색칸, 15_000), true, { blocker: true });
  });
  await test.step('목록 구성원 검색에 팔로우하지 않는 cafe_moon 을 찾는다', async () => {
    await 칸에적기(await driver.$(목록.검색칸).getElement(), params.찾을사용자);
    const 걸러짐 = await verify('검색어에 맞지 않는 팔로우 중인 사람이 목록에서 빠진다', await 사라질때까지(driver, 목록.계정('minjun_dev'), 10_000), true);
    const 안보임 = await verify('팔로우하지 않는 사람이 검색 결과에 보이지 않는다', !(await 보이나(driver, 목록.계정(params.찾을사용자))), true);
    await verify('목록 구성원 검색에 팔로우하지 않는 사람을 찾으면 그 사람이 보이지 않는다', 걸러짐 && 안보임, true);
  });
});
