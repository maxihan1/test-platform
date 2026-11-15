import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-359',
  name: '목록 편집에 이름 · 「답장을 표시할 대상:」 · 「팔로우 중인 구성원 숨기기」 · 「리스트 구성원」 · 「리스트 삭제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    답장글: z.string().describe('목록 편집 글').default('답장을 표시할 대상:'),
    숨기기글: z.string().describe('목록 편집 줄 이름').default('팔로우 중인 구성원 숨기기'),
    구성원글: z.string().describe('목록 편집 줄 이름').default('리스트 구성원'),
    삭제글: z.string().describe('목록 편집 메뉴 항목').default('리스트 삭제'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('목록 「개발 소식」의 「목록 관리」를 연다', async () => {
    await 홈.목록고르기('개발 소식');
    await 뜰때까지(driver, 홈.목록관리, 15_000);
    await driver.$(홈.목록관리).click();
    await verify('목록 편집 화면이 열린다', await 목록.편집그려질때까지(), true, { blocker: true });
    const 이름 = await verify('목록 편집에 이름 칸이 보인다', await 뜰때까지(driver, 목록.편집이름칸, 10_000), true);
    const 답장 = await verify('목록 편집에 「답장을 표시할 대상:」이 보인다', await 뜰때까지(driver, 목록.화면글(expected.답장글), 10_000), true);
    const 숨기기 = await verify('목록 편집에 「팔로우 중인 구성원 숨기기」가 보인다', await 뜰때까지(driver, 목록.편집줄(expected.숨기기글), 10_000), true);
    const 구성원 = await verify('목록 편집에 「리스트 구성원」이 보인다', await 뜰때까지(driver, 목록.편집줄(expected.구성원글), 10_000), true);
    await driver.$(목록.편집더보기).click();
    const 삭제 = await verify('목록 편집에 「리스트 삭제」가 보인다', await 홈.메뉴.뜰때까지(expected.삭제글), true);
    await verify('목록 편집에 이름 · 「답장을 표시할 대상:」 · 「팔로우 중인 구성원 숨기기」 · 「리스트 구성원」 · 「리스트 삭제」가 보인다', 이름 && 답장 && 숨기기 && 구성원 && 삭제, true);
  });
});
