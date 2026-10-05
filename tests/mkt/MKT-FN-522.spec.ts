import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 공지팝업되돌리기, 공지팝업읽기 } from './components/member-helpers.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-522',
  name: '「홈 공지 팝업」 스위치를 바꾸면 바로 저장되고 토스트 「저장되었습니다」가 보인다',
  held: '보류 — 관리자 계정 비밀번호가 실행 환경에 없다(테스트 계정은 회원 하나다)',
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
  let 원래 = false;

  try {
    await test.step('로그인 요청으로 관리자 계정에 로그인한다', async () => {
      await API로그인(page.request, 계정.loginId, 계정.password);
      원래 = await 공지팝업읽기(page.request);
    });

    await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 「관리자」 링크가 보인다', await 헤더.관리자링크.isVisible(), true, { blocker: true });
    });

    await test.step('「홈 공지 팝업」 스위치를 바꾼다', async () => {
      await 관리자.열기();
      await 관리자.패널열기(관리자.공지팝업스위치);
      await 관리자.공지팝업스위치.click();
      await 알림.기다리기('저장되었습니다');
      await verify(
        '「홈 공지 팝업」 스위치를 바꾸면 바로 저장되고 토스트 「저장되었습니다」가 보인다',
        { 토스트: await 알림.문구('저장되었습니다').first().isVisible(), 저장값: await 공지팝업읽기(page.request) },
        { 토스트: true, 저장값: !원래 },
      );
    });
  } finally {
    await 공지팝업되돌리기(page.request, 원래);
  }
});
