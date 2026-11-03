import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영틀 } from './components/ops-frame.component.js';
import { 쇼핑몰머리줄 } from './components/shop-header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-140',
  name: '공통 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 틀 = new 운영틀(page);
  const 대시보드 = new 대시보드화면(page);
  const 회원 = new 회원관리화면(page);

  await test.step('관리자 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.adminId ?? '', params.adminPassword ?? '');
    await verify('관리자 계정으로 로그인해 있다', (await 세션읽기(page))?.role, 'admin', { blocker: true });
    await 대시보드.열기();
  });

  await test.step('머리줄의 「쇼핑몰 열기」를 누른다', async () => {
    const 새탭기다림 = page.context().waitForEvent('page');
    await 틀.쇼핑몰열기.click();
    const 새탭 = await 새탭기다림;
    try {
      await 새탭.waitForLoadState('domcontentloaded');
      await new 쇼핑몰머리줄(새탭).종.waitFor();
      await verify('운영 화면에서 「쇼핑몰 열기」를 누르면 쇼핑몰이 새 탭으로 열린다', new URL(새탭.url()).pathname, '/');
    } finally {
      await 새탭.close();
    }
  });

  await test.step('머리줄의 「로그아웃」을 누른다', async () => {
    await 틀.로그아웃.click();
    await 틀.창버튼('확인').waitFor();
    await verify('운영 화면에서 「로그아웃」을 누르면 확인 창이 뜬다', await 틀.확인창.isVisible(), true);
  });

  await test.step('로그아웃 확인 창에서 「취소」를 누른다', async () => {
    await 틀.창버튼('취소').click();
    await 틀.확인창.waitFor({ state: 'detached' });
    await verify('로그아웃 확인 창에서 「취소」를 누르면 창이 닫힌다', await 틀.확인창.isVisible(), false);
  });

  await test.step('머리줄의 「데모마켓」을 누른다', async () => {
    await 회원.열기();
    await 틀.로고.click();
    await 대시보드.이동끝날때까지('대시보드');
    await verify('운영 화면에서 「데모마켓」을 누르면 대시보드로 간다', await 대시보드.제목.isVisible(), true);
  });

  await test.step('왼쪽 메뉴의 「회원」을 누른다', async () => {
    await 틀.메뉴항목('회원').click();
    await 대시보드.이동끝날때까지('회원');
    await verify('운영 화면에서 왼쪽 메뉴 「회원」을 누르면 회원 관리 화면으로 간다', await 회원.제목.isVisible(), true);
  });
});
