import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-318',
  name: '프로필 타임라인 머리에 「Posts and boosts」가 보이고 필터 버튼을 누르면 「Show replies」 · 「Show boosts」가 보인다',
  platforms: ['android'],
  held: '보류 — 앱 — MTA-REQ-318 — 주소 없음(프로필 타임라인 필터 메뉴 「Show replies」 · 「Show boosts」가 화면 글에 안 잡힘)',
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    머리글: z.string().describe('프로필 타임라인 머리 글').default('Posts and boosts'),
    답글글: z.string().describe('필터 메뉴 항목').default('Show replies'),
    부스트글: z.string().describe('필터 메뉴 항목').default('Show boosts'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('hana_photo 프로필 타임라인 머리의 필터 버튼을 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 뜰때까지(driver, 프로필.굴려서글자포함(expected.머리글), 15_000);
    const 머리 = await verify('프로필 타임라인 머리에 「Posts and boosts」가 보인다', await 글읽기(driver, 프로필.필터제목), expected.머리글);
    await driver.$(프로필.필터버튼).click();
    const 답글 = await verify('필터 메뉴에 「Show replies」가 보인다', await 프로필.메뉴.뜰때까지(expected.답글글), true);
    const 부스트 = await verify('필터 메뉴에 「Show boosts」가 보인다', await 프로필.메뉴.뜰때까지(expected.부스트글), true);
    await verify('프로필 타임라인 머리에 「Posts and boosts」가 보이고 필터 버튼을 누르면 「Show replies」 · 「Show boosts」가 보인다', 머리 && 답글 && 부스트, true);
  });
});
