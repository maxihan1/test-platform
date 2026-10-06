import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 배너되돌리기, 배너읽기, type 배너 } from './components/member-helpers.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-520',
  name: '모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보이고 저장되지 않는다',
  techniques: ['결정 테이블'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 관리자계정값(params);
  const 관리자 = new 관리자화면(page);
  const 헤더 = new 머리글(page);
  const 알림 = new 토스트(page);
  let 원래: 배너[] = [];

  try {
    await test.step('로그인 요청으로 관리자 계정에 로그인한다', async () => {
      await API로그인(page.request, 계정.loginId, 계정.password);
      원래 = await 배너읽기(page.request);
    });

    await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 「관리자」 링크가 보인다', await 헤더.관리자링크.isVisible(), true, { blocker: true });
    });

    await test.step('배너 관리에서 모든 배너의 「노출」을 끄고 「저장」을 누른다', async () => {
      await 관리자.배너관리열기();
      const 개수 = await 관리자.배너줄들.count();
      for (let 번째 = 1; 번째 <= 개수; 번째 += 1) await 관리자.배너노출스위치(번째).uncheck();
      await 관리자.배너저장버튼.click();
      await 알림.기다리기('배너를 하나 이상 노출해야 합니다');
      await verify(
        '모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보이고 저장되지 않는다',
        {
          문구보임: await 알림.문구('배너를 하나 이상 노출해야 합니다').first().isVisible(),
          노출배너있음: (await 배너읽기(page.request)).some((배너줄) => 배너줄.visible),
        },
        { 문구보임: true, 노출배너있음: true },
      );
    });
  } finally {
    await 배너되돌리기(page.request, 원래);
  }
});
