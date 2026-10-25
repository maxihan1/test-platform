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
  tcId: 'DMW-FN-332',
  name: '배너 순서를 바꿔 저장하면 홈 첫 배너가 바뀐 순서의 첫 배너다',
  platforms: ['desktop', 'mobile'],
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
  let 처음순서: string[] = [];

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
    원래 = await 배너설정읽기(page.request);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  try {
    await test.step('관리자 화면의 배너 관리 탭을 연다', async () => {
      await 화면.열기();
      await 화면.배너탭.click();
      await 화면.위로버튼들.first().waitFor();
      처음순서 = await 화면.배너제목들();
      await verify('배너가 둘 이상 보인다', 처음순서.length >= 2, true, { blocker: true });
    });

    await test.step('배너 순서를 바꿔 「저장」한 뒤 홈 화면을 연다', async () => {
      await 화면.배너끌어다놓기(처음순서[0], 처음순서[1]);
      await 화면.배너저장누르기();
      await 알림.글('저장되었습니다').first().waitFor();
      await page.goto('/');
      await 홈.그려질때까지();
      await verify('배너 순서를 바꿔 저장하면 홈 첫 배너가 바뀐 순서의 첫 배너다', (await 홈.장제목들.allInnerTexts())[0], 처음순서[1]);
    });
  } finally {
    await 배너설정돌려놓기(page.request, 원래);
  }
});
