import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-272',
  name: '모든 배너를 끄고 「저장」하면 「배너를 하나 이상 노출해야 합니다」가 보인다',
  held: '보류 — 관리자 계정 비밀번호',
  techniques: ['결정 테이블'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 원래배너: { id: number; visible: boolean }[] = [];
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      await API로그인(page.request, 관리자계정.loginId, 관리자계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정 세션이 있다', (await 내정보(page.request)).loginId === 관리자계정.loginId, true, { blocker: true });
    });

    await test.step('배너 원래 상태를 읽어 둔다', async () => {
      원래배너 = ((await (await page.request.get('/api/admin/banners')).json()) as { items: { id: number; visible: boolean }[] }).items.map((배너) => ({ id: 배너.id, visible: 배너.visible }));
    });

    await test.step('모든 배너의 「노출」을 끄고 「저장」을 누른다', async () => {
      await 관리자.열기();
      await 관리자.배너관리탭.click();
      await 관리자.배너줄들.first().waitFor();
      for (const 줄 of await 관리자.배너줄들.all()) await 관리자.배너노출스위치(줄).uncheck();
      await 관리자.배너저장.click();
      await verify('모든 배너를 끄고 「저장」하면 「배너를 하나 이상 노출해야 합니다」가 보인다', await 알림.글('배너를 하나 이상 노출해야 합니다').isVisible(), true);
    });

    await test.step('모든 배너의 「노출」을 끄고 「저장」을 누른 뒤 홈을 연다', async () => {
      await 관리자.열기();
      await 관리자.배너관리탭.click();
      await 관리자.배너줄들.first().waitFor();
      for (const 줄 of await 관리자.배너줄들.all()) await 관리자.배너노출스위치(줄).uncheck();
      await 관리자.배너저장.click();
      await 알림.글('배너를 하나 이상 노출해야 합니다').waitFor();
      const 노출 = (await (await page.request.get('/api/banners')).json()) as { items: { title: string }[] };
      await page.goto('/');
      await 관리자.홈배너제목들.first().waitFor();
      await verify('모든 배너를 끄고 「저장」해도 홈 배너는 그대로 보인다', (await 관리자.홈배너제목들.allInnerTexts()).join('|') === 노출.items.map((배너) => 배너.title).join('|'), true);
    });
  } finally {
    if (원래배너.length > 0) await page.request.put('/api/admin/banners', { data: { items: 원래배너 } });
  }
});
