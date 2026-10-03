import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인부품 } from './components/login.component.js';
import { 머리글부품 } from './components/header.component.js';
import { 홈부품 } from './components/home.component.js';

export const spec = defineCase({
  tcId: 'CDY-UI-005',
  name: '로그인 뒤 홈 머리글에 메뉴 넷과 사용자 메뉴 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 이메일').optional().meta({ secret: true }),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈부품(page);
  const 머리글 = new 머리글부품(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await new 로그인부품(page).로그인하기(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인 뒤 홈이 열린 것을 확인한다', async () => {
    const 보임 = await 홈.여정시작.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('로그인 뒤 홈에 「Journey Start!」가 보인다', 보임, true, { blocker: true });
  });

  await test.step('로그인 뒤 홈 머리글을 연다', async () => {
    await page.goto('/');

    let 보임 = await 머리글.메뉴('코디세이란').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈 머리글에 「코디세이란」 메뉴가 보인다', 보임, true);

    보임 = await 머리글.메뉴('과정소개').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈 머리글에 「과정소개」 메뉴가 보인다', 보임, true);

    보임 = await 머리글.메뉴('모집안내').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈 머리글에 「모집안내」 메뉴가 보인다', 보임, true);

    보임 = await 머리글.메뉴('알림마당').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈 머리글에 「알림마당」 메뉴가 보인다', 보임, true);

    보임 = await 머리글.사용자메뉴버튼.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈 머리글에 사용자 메뉴 버튼이 보인다', 보임, true);
  });
});
