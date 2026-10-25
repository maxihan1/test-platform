import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈배너 } from './components/banner.component.js';
import { 토스트 } from './components/toast.component.js';
import { 배너설정돌려놓기, 배너설정읽기, type 배너줄 } from './helpers/my-admin-tools.helper.js';
import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-334',
  name: '모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['결정 테이블'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 관리자화면(page);
  const 홈 = new 홈배너(page);
  const 알림 = new 토스트(page);
  let 원래: 배너줄[] = [];
  let 노출하던제목: string[] = [];

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
    원래 = await 배너설정읽기(page.request);
    노출하던제목 = 원래.filter((줄) => 줄.visible).map((줄) => 줄.title);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  try {
    await test.step('관리자 화면의 배너 관리 탭을 연다', async () => {
      await 화면.열기();
      await 화면.배너탭.click();
      await 화면.위로버튼들.first().waitFor();
      await verify('배너가 하나 이상 노출되고 있다', 노출하던제목.length > 0, true, { blocker: true });
    });

    await test.step('배너 셋의 「노출」을 다 끄고 「저장」을 누른다', async () => {
      for (const 제목 of 노출하던제목) await 화면.노출스위치(제목).uncheck();
      await 화면.배너저장누르기();
      await 알림.글('배너를 하나 이상 노출해야 합니다').first().waitFor();
      await verify('모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보인다', await 알림.글('배너를 하나 이상 노출해야 합니다').first().isVisible(), true);
    });

    await test.step('모두 끈 채 저장을 누른 뒤 홈 배너를 확인한다', async () => {
      await 화면.배너저장누르기();
      await page.goto('/');
      await 홈.그려질때까지();
      await verify('모든 배너를 끄고 저장해도 홈 배너는 그대로 보인다', (await 홈.장제목들.allInnerTexts()).join(', '), 노출하던제목.join(', '));
    });
  } finally {
    await 배너설정돌려놓기(page.request, 원래);
  }
});
