import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 화면글정확 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-204',
  name: '공개 범위 버튼을 누르면 「공개 범위 및 상호작용」 시트에 「공개」 · 「제한적 공개」 · 「팔로워」 · 「개인 멘션」 · 「모든 사용자」 · 「팔로워만」 · 「본인만」 · 「취소」 · 「저장」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목: z.string().describe('공개 범위 시트 제목').default('공개 범위 및 상호작용'),
    공개: z.string().describe('공개 범위 항목').default('공개'),
    제한적공개: z.string().describe('공개 범위 항목').default('제한적 공개'),
    팔로워: z.string().describe('공개 범위 항목').default('팔로워'),
    개인멘션: z.string().describe('공개 범위 항목').default('개인 멘션'),
    모든사용자: z.string().describe('인용 가능 범위 항목').default('모든 사용자'),
    팔로워만: z.string().describe('인용 가능 범위 항목').default('팔로워만'),
    본인만: z.string().describe('인용 가능 범위 항목').default('본인만'),
    취소: z.string().describe('취소 버튼 글자').default('취소'),
    저장: z.string().describe('저장 버튼 글자').default('저장'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('글쓰기의 공개 범위 버튼을 누른다', async () => {
    await driver.$(글쓰기.공개범위버튼).click();
    await verify('공개 범위 시트가 열린다', await 시트.그려질때까지(), true, { blocker: true });

    const 제목 = await verify('시트 제목이 보인다', await 뜰때까지(driver, 화면글정확(expected.제목), 10_000), true);
    const 공개 = await verify('공개 범위 칸 글자가 기대값과 같다', await 시트.공개글(), expected.공개);
    await 시트.공개열기();
    const 제한 = await verify('「제한적 공개」가 보인다', await 시트.메뉴.뜰때까지(expected.제한적공개), true);
    const 팔로워 = await verify('「팔로워」가 보인다', await 시트.메뉴.뜰때까지(expected.팔로워), true);
    const 멘션 = await verify('「개인 멘션」이 보인다', await 시트.메뉴.뜰때까지(expected.개인멘션), true);
    await 시트.메뉴.고르기(expected.공개);
    const 모두 = await verify('인용 가능 범위 칸 글자가 기대값과 같다', await 시트.인용글(), expected.모든사용자);
    await 시트.인용열기();
    const 팔로워만 = await verify('「팔로워만」이 보인다', await 시트.메뉴.뜰때까지(expected.팔로워만), true);
    const 본인만 = await verify('「본인만」이 보인다', await 시트.메뉴.뜰때까지(expected.본인만), true);
    await 시트.메뉴.고르기(expected.모든사용자);
    const 취소 = await verify('취소 버튼 글자가 기대값과 같다', await driver.$(시트.취소).getText(), expected.취소);
    const 저장 = await verify('저장 버튼 글자가 기대값과 같다', await driver.$(시트.저장).getText(), expected.저장);
    await verify('공개 범위 버튼을 누르면 「공개 범위 및 상호작용」 시트에 「공개」 · 「제한적 공개」 · 「팔로워」 · 「개인 멘션」 · 「모든 사용자」 · 「팔로워만」 · 「본인만」 · 「취소」 · 「저장」이 보인다', 제목 && 공개 && 제한 && 팔로워 && 멘션 && 모두 && 팔로워만 && 본인만 && 취소 && 저장, true);
  });
});
