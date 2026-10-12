import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-281',
  name: '모든 배너를 끄고 「저장」하면 「배너를 하나 이상 노출해야 합니다」가 보인다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  techniques: ['결정 테이블'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = 관리자값(params);
  const 화면 = new 관리자화면(page);
  const 홈 = new 홈화면(page);
  let 원래: { id: number; visible: boolean }[] = [];

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자.loginId, 관리자.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
  });

  try {
    await test.step('원래 배너 노출을 기억해 둔다', async () => {
      원래 = ((await (await page.request.get('/api/banners')).json()) as { items: { id: number; visible: boolean }[] }).items.map((배너) => ({ id: 배너.id, visible: 배너.visible }));
      await verify('노출 배너가 하나 이상 있다', 원래.length >= 1, true, { blocker: true });
    });

    await test.step('배너 관리 화면을 준비한다', async () => {
      await 화면.열기();
      await 화면.배너관리탭.click();
      await 화면.배너줄들.first().waitFor();
    });

    await test.step('배너 관리 목록이 열렸는지 확인한다', async () => {
      await verify('배너 관리에 배너가 둘 이상 있다', (await 화면.배너줄들.count()) >= 2, true, { blocker: true });
    });

    await test.step('모든 배너의 「노출」을 끄고 「저장」을 누른다', async () => {
      for (let 번째 = 0; 번째 < 10 && (await 화면.켜진노출스위치들.count()) > 0; 번째 += 1) await 화면.켜진노출스위치들.first().click();
      await 화면.배너저장.click();
      await 화면.노출오류.waitFor();
      await verify('모든 배너를 끄고 「저장」하면 「배너를 하나 이상 노출해야 합니다」가 보인다', await 화면.노출오류.isVisible(), true);
    });

    await test.step('모든 배너의 「노출」을 끄고 「저장」을 누른 뒤 홈을 연다', async () => {
      await 홈.열기();
      await 화면.홈배너제목들.first().waitFor();
      await verify('모든 배너를 끄고 「저장」해도 홈 배너는 그대로 보인다', (await 화면.홈배너제목들.count()) >= 원래.length, true);
    });
  } finally {
    if (원래.length > 0) await page.request.put('/api/admin/banners', { data: { items: 원래 } });
  }
});
