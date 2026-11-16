import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 신고화면 } from './pages/report.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-447',
  name: '글에서 신고를 시작하면 글 고르기 화면에서 그 글이 골라져 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('신고를 시작할 글쓴이 사용자명 — 글이 있는 시드 계정').default('minjun_dev'),
    신고항목: z.string().min(1).describe('글 더보기 메뉴의 신고 항목 — 글쓴이 표시 이름 뒤에 「 신고」').default('민준 신고'),
    이유: z.string().min(1).describe('선택할 신고 이유 — 글 고르기 화면으로 이어지는 이유').default('스팸입니다'),
  }),
  expected: z.object({
    게시물묻는글: z.string().describe('글 고르기 화면 질문').default('이 신고에 대해서 더 참고해야 할 게시물이 있나요?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 신고 = new 신고화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('minjun_dev 글 더보기에서 신고 항목을 눌러 신고 첫 화면을 연다', async () => {
    await 프로필열기(driver, params.사용자명);
    await driver.$(프로필.굴려서더보기).click();
    await 프로필.메뉴항목누르기(params.신고항목);
    await verify('글 신고 첫 화면이 열린다', await 신고.그려질때까지(), true, { blocker: true });
  });

  await test.step('글에서 신고를 시작해 글 고르기 화면까지 간다', async () => {
    await 신고.이유고르기(params.이유);
    await 신고.첫다음누르기();
    await verify('글 고르기 화면이 열린다', await 뜰때까지(driver, 신고.화면글(expected.게시물묻는글), 15_000), true, { blocker: true });
    await verify('글에서 신고를 시작하면 글 고르기 화면에서 그 글이 골라져 있다', await 보이나(driver, 신고.골라진글), true);
  });
});
