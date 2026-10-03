import { defineCase, test, verify } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 토스트 } from './components/toast.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-024',
  name: '배너 관리에서 순서와 노출을 바꾸고 저장하면 홈 배너에 반영되고 모두 끄면 막힌다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다', '홈 배너 3장이 처음 순서다', '홈 배너 3장이 모두 노출 중이다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

const 처음제목 = ['가을 신상 컬렉션', '전자기기 기획전', '책 읽는 계절'];

async function 원래대로(request: APIRequestContext): Promise<void> {
  await request.put('/api/admin/banners', { data: { items: [1, 2, 3].map((id) => ({ id, visible: true })) } });
}

async function 배너상태(request: APIRequestContext): Promise<{ 제목들: string[]; 모두노출: boolean }> {
  const 본문 = (await (await request.get('/api/admin/banners')).json()) as { items: { title: string; visible: boolean }[] };
  return { 제목들: 본문.items.map((배너) => 배너.title), 모두노출: 본문.items.every((배너) => 배너.visible) };
}

test(spec, async ({ page, request, params }) => {
  const 홈 = new 홈화면(page);
  const 로그인 = new 로그인폼(page);
  const 관리자 = new 관리자화면(page);
  const 알림 = new 토스트(page);

  try {
    await test.step('로그인 화면에서 관리자로 로그인한다', async () => {
      await 홈.쿠키띠를치운다();
      await 홈.공지팝업을치운다();
      await 홈.설문을치운다();
      await request.post('/api/auth/login', { data: { loginId: params.adminId, password: params.adminPassword ?? '', remember: false } });
      await 로그인.로그인한다(params.adminId, params.adminPassword ?? '');
      const 상태 = await 배너상태(request);
      await verify('홈 배너 3장이 처음 순서다', 상태.제목들, 처음제목, { blocker: true });
      await verify('홈 배너 3장이 모두 노출 중이다', 상태.모두노출, true, { blocker: true });
    });

    await test.step('배너 관리에서 배너를 끌어다 놓아 순서를 바꾸고 「저장」을 누른 뒤 홈 화면을 연다', async () => {
      await 관리자.열기();
      await 관리자.배너관리를연다();
      await 관리자.배너줄(처음제목[0]).dragTo(관리자.배너줄(처음제목[2]));
      const 바꾼순서 = await 관리자.배너제목들.allInnerTexts();
      await 관리자.배너저장.click();
      await 알림.문구('저장되었습니다').waitFor();
      await 홈.열기();
      await 홈.배너점(3).waitFor();
      const 홈순서 = await 홈.배너슬라이드.getByRole('heading').allInnerTexts();
      await verify(
        '배너 관리에서 순서를 바꾸고 「저장」을 누르면 홈 배너에 바로 반영된다',
        [바꾼순서.join(',') !== 처음제목.join(','), 홈순서.join(',')],
        [true, 바꾼순서.join(',')],
      );
    });

    await test.step('배너 하나의 「노출」 스위치를 끄고 「저장」을 누른 뒤 홈 화면을 연다', async () => {
      await 관리자.열기();
      await 관리자.배너관리를연다();
      await 관리자.노출스위치(처음제목[1]).uncheck();
      await 관리자.배너저장.click();
      await 알림.문구('저장되었습니다').waitFor();
      await 홈.열기();
      await 홈.배너점(2).waitFor();
      const 홈순서 = await 홈.배너슬라이드.getByRole('heading').allInnerTexts();
      await verify('「노출」 스위치를 끄고 저장하면 홈 배너에서 그 배너가 빠진다', [홈순서.includes(처음제목[1]), 홈순서.length], [false, 2]);
    });

    await test.step('배너 3장의 「노출」 스위치를 모두 끄고 「저장」을 누른다', async () => {
      await 원래대로(request);
      await verify('홈 배너 3장이 모두 노출 중이다', (await 배너상태(request)).모두노출, true, { blocker: true });
      await 관리자.열기();
      await 관리자.배너관리를연다();
      for (const 제목 of 처음제목) await 관리자.노출스위치(제목).uncheck();
      await 관리자.배너저장.click();
      const 보임 = await 알림.문구('배너를 하나 이상 노출해야 합니다').waitFor({ state: 'visible', timeout: 5000 }).then(
        () => true,
        () => false,
      );
      await verify('모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보인다', 보임, true);
    });
  } finally {
    await 원래대로(request);
  }
});
