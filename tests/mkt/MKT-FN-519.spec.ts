import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 배너되돌리기, 배너읽기, type 배너 } from './components/member-helpers.component.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 회원홈화면 } from './pages/member-home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-519',
  name: '배너 순서를 바꿔 저장하면 홈 배너가 바뀐 순서로 보인다',
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
  const 홈 = new 회원홈화면(page);
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

    await test.step('배너 관리에서 첫 배너를 끌어 맨 아래에 놓고 「저장」을 누른다', async () => {
      await 관리자.배너관리열기();
      const 이전 = await 관리자.배너줄읽기();
      await 관리자.첫배너를맨아래로끌기();
      await 관리자.배너저장버튼.click();
      await 알림.기다리기('저장되었습니다');
      const 기대 = [...이전.slice(1), ...이전.slice(0, 1)].filter((줄) => 줄.노출).map((줄) => 줄.제목);
      await 홈.열기();
      await verify('배너 순서를 바꿔 저장하면 홈 배너가 바뀐 순서로 보인다', await 홈.배너제목들.allInnerTexts(), 기대);
    });

    await test.step('배너 관리에서 둘째 배너의 「노출」을 끄고 「저장」을 누른다', async () => {
      await 관리자.배너관리열기();
      const 둘째 = (await 관리자.배너줄읽기())[1];
      await verify('둘째 배너는 노출 상태다', 둘째?.노출, true, { blocker: true });
      await 관리자.배너노출스위치(2).uncheck();
      await 관리자.배너저장버튼.click();
      await 알림.기다리기('저장되었습니다');
      await 홈.열기();
      await verify('노출을 끈 배너는 홈 배너에 보이지 않는다', (await 홈.배너제목들.allInnerTexts()).includes(둘째?.제목 ?? ''), false);
    });
  } finally {
    await 배너되돌리기(page.request, 원래);
  }
});
