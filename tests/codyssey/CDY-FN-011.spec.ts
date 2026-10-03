import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인부품 } from './components/login.component.js';
import { 머리글부품 } from './components/header.component.js';
import { 홈부품 } from './components/home.component.js';
import { 내정보화면 } from './pages/myinfo.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-011',
  name: '사용자 메뉴에서 「내 정보」를 누르면 「내 정보」 화면 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['사용자 메뉴가 열려 있다', '테스트 계정으로 로그인해 있다'],
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
  const 내정보 = new 내정보화면(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await new 로그인부품(page).로그인하기(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인 뒤 홈이 열린 것을 확인한다', async () => {
    const 보임 = await 홈.여정시작.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('로그인 뒤 홈에 「Journey Start!」가 보인다', 보임, true, { blocker: true });
  });

  await test.step('머리글에서 사용자 메뉴 버튼을 누른다', async () => {
    await 머리글.사용자메뉴버튼.click();
  });

  await test.step('사용자 메뉴가 열린 것을 확인한다', async () => {
    const 보임 = await 머리글.내정보버튼.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('사용자 메뉴에 「내 정보」 버튼이 보인다', 보임, true, { blocker: true });
  });

  await test.step('사용자 메뉴에서 「내 정보」를 누른다', async () => {
    await 머리글.내정보버튼.click();
    const 보임 = await 내정보.제목.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('사용자 메뉴에서 「내 정보」를 누르면 「내 정보」 화면 제목이 보인다', 보임, true);
  });
});
