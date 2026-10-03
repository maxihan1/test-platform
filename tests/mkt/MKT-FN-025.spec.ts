import { defineCase, test, verify } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-025',
  name: '「홈 공지 팝업」 스위치를 끄면 바로 저장되고 홈에서 공지 팝업이 뜨지 않는다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다', '「홈 공지 팝업」 스위치가 켜져 있다', '「홈 공지 팝업」 스위치를 껐다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

async function 공지를켠다(request: APIRequestContext): Promise<void> {
  await request.put('/api/admin/settings', { data: { noticePopup: true } });
}

test(spec, async ({ page, request, params }) => {
  const 홈 = new 홈화면(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  const 브라우저 = page.context().browser();
  const 새문맥 = 브라우저 === null ? null : await 브라우저.newContext({ baseURL: process.env.PLATFORM_BASE_URL });

  try {
    await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
      await 홈.쿠키띠를치운다();
      await 홈.공지팝업을치운다();
      await 홈.설문을치운다();
      await request.post('/api/auth/login', { data: { loginId: params.adminId, password: params.adminPassword ?? '', remember: false } });
      await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
    });

    await test.step('설정 · 내보내기 탭에서 「홈 공지 팝업」 스위치를 확인한다', async () => {
      await 관리자.열기();
      await 관리자.설정탭을연다();
      await 관리자.공지스위치.waitFor();
      await verify('「홈 공지 팝업」 스위치가 켜져 있다', await 관리자.공지스위치.isChecked(), true, { blocker: true });
    });

    await test.step('「홈 공지 팝업」 스위치를 끈다', async () => {
      await 관리자.공지스위치.uncheck();
      const 보임 = await 알림.문구('저장되었습니다').waitFor({ state: 'visible', timeout: 5000 }).then(
        () => true,
        () => false,
      );
      const 저장된값 = ((await (await request.get('/api/settings')).json()) as { noticePopup: boolean }).noticePopup;
      await verify('「홈 공지 팝업」 스위치를 바꾸면 바로 저장되고 토스트 「저장되었습니다」가 보인다', [보임, 저장된값], [true, false]);
    });

    await test.step('처음 방문한 브라우저로 홈 화면을 연다', async () => {
      if (새문맥 === null) throw new Error('브라우저를 얻지 못해 새 문맥을 만들 수 없다');
      const 새홈 = new 홈화면(await 새문맥.newPage());
      await 새홈.열고설정응답을기다린다();
      await 새홈.추천카드.first().waitFor();
      await verify('관리자가 공지 팝업을 끄면 홈에서 공지 팝업이 뜨지 않는다', await 새홈.공지팝업.isVisible(), false);
    });
  } finally {
    await 공지를켠다(request);
    await 새문맥?.close();
  }
});
