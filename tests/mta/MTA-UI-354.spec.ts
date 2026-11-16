import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-354',
  name: '목록 타임라인에 글이 보이고 도구 줄 「목록 관리」를 누르면 「리스트 구성원」이 있는 「목록 관리」 화면이 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    구성원글: z.string().describe('목록 관리 화면의 줄 이름').default('리스트 구성원'),
    관리글: z.string().describe('도구 줄 버튼 이름 · 목록 관리 화면 제목').default('목록 관리'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('목록 「개발 소식」 타임라인에서 도구 줄 「목록 관리」를 누른다', async () => {
    await 홈.목록고르기('개발 소식');
    await verify('목록 타임라인의 옵션 더보기 버튼이 보인다', await 뜰때까지(driver, 홈.옵션더보기, 15_000), true, { blocker: true });
    const 글 = await verify('목록 타임라인에 글이 보인다', await 뜰때까지(driver, 홈.글본문들, 15_000), true);
    await driver.$(`~${expected.관리글}`).click();
    const 관리 = await verify('「목록 관리」 화면이 열린다', await 뜰때까지(driver, new 목록화면(driver).편집이름칸, 15_000), true);
    const 구성원 = await verify('「목록 관리」 화면에 「리스트 구성원」이 보인다', await 뜰때까지(driver, new 목록화면(driver).화면글(expected.구성원글), 10_000), true);
    await verify('목록 타임라인에 글이 보이고 도구 줄 「목록 관리」를 누르면 「리스트 구성원」이 있는 「목록 관리」 화면이 열린다', 글 && 관리 && 구성원, true);
  });
});
