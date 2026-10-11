import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-132',
  name: '모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」 가 보이고 저장되지 않는다',
  platforms: ['desktop'],
  precondition: [
    '관리자로 로그인해 있다',
  ],
  techniques: ['결정 테이블'],
  held: '보류 — 관리자 계정이 없다',
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  const 머리 = new 머리글(page);
  let 처음배너: { id: number; visible: boolean }[] = [];

  try {
    await 방해막기(page);

    await test.step('관리자로 로그인한다', async () => {
      await 화면로그인(page, params.adminLoginId, params.adminPassword ?? '');
      await 머리.관리자링크.waitFor();
      await verify('머리글에 「관리자」 링크가 보인다', await 머리.관리자링크.isVisible(), true, { blocker: true });
      const 배너 = (await (await page.request.get('/api/admin/banners')).json()) as { items: { id: number; visible: boolean }[] };
      처음배너 = 배너.items.map((칸) => ({ id: 칸.id, visible: 칸.visible }));
    });

    await test.step('배너 관리에서 모든 배너의 「노출」 을 끄고 「저장」 을 누른다', async () => {
      await 관리자.열기();
      await 관리자.탭('배너 관리').click();
      await 관리자.배너줄들.first().waitFor();
      const 처음켜진수 = await 관리자.노출켜진배너수();
      for (const 스위치 of await 관리자.배너노출스위치들.all()) {
        if (await 스위치.isChecked()) await 스위치.uncheck();
      }
      await 관리자.배너저장버튼.click();
      await 알림.모두.first().waitFor();
      const 안내 = await 알림.모두.first().innerText();
      await page.reload();
      await 관리자.탭('배너 관리').click();
      await 관리자.배너줄들.first().waitFor();
      await verify(
        '모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」 가 보이고 저장되지 않는다',
        { 안내, 저장안됨: (await 관리자.노출켜진배너수()) === 처음켜진수 },
        { 안내: '배너를 하나 이상 노출해야 합니다', 저장안됨: true },
      );
    });
  } finally {
    if (처음배너.length > 0) await page.request.put('/api/admin/banners', { data: { items: 처음배너 } });
  }
});
