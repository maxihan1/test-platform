import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-353',
  name: '「목록 관리」 화면에 목록 줄과 「목록 만들기」가 보이고 줄 메뉴에 「목록 관리」 · 「리스트 삭제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    목록이름: z.string().min(1).describe('목록 줄로 볼 내 목록 이름 — 시드 목록').default('개발 소식'),
  }),
  expected: z.object({
    관리글: z.string().describe('줄 메뉴 항목').default('목록 관리'),
    삭제글: z.string().describe('줄 메뉴 항목').default('리스트 삭제'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 드롭다운에서 「목록 관리」를 누른다', async () => {
    await 홈.드롭다운열기();
    await 홈.메뉴.고르기('목록');
    await 홈.메뉴.고르기(expected.관리글);
    const 줄 = await verify('「목록 관리」 화면에 목록 줄이 보인다', await 뜰때까지(driver, 목록.편집줄(params.목록이름), 15_000), true);
    const 만들기 = await verify('「목록 관리」 화면에 「목록 만들기」가 보인다', await 뜰때까지(driver, 목록.만들기버튼, 10_000), true);
    await verify('목록 줄 옵션 메뉴 단추가 보인다', await 뜰때까지(driver, 목록.줄옵션, 10_000), true, { blocker: true });
    await driver.$(목록.줄옵션).click();
    const 관리 = await verify('줄 메뉴에 「목록 관리」가 보인다', await 뜰때까지(driver, 목록.줄메뉴항목(expected.관리글), 10_000), true);
    const 삭제 = await verify('줄 메뉴에 「리스트 삭제」가 보인다', await 뜰때까지(driver, 목록.줄메뉴항목(expected.삭제글), 10_000), true);
    await verify('「목록 관리」 화면에 목록 줄과 「목록 만들기」가 보이고 줄 메뉴에 「목록 관리」 · 「리스트 삭제」가 보인다', 줄 && 만들기 && 관리 && 삭제, true);
    await driver.back();
  });
});
