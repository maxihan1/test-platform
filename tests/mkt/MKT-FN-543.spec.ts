import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 로그인요청, 임시회원가입, 임시회원정보, 임시회원지우기, 관리자계정값, 틀린로그인 } from './components/account.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-543',
  name: '칸 제목을 누르면 아이디 오름차순으로 정렬되고 제목 옆에 「▲」가 보인다',
  precondition: ['관리자 계정으로 로그인해 있다', '비밀번호 5회 실패로 잠긴 새 회원이 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, request, params }) => {
  const 계정 = 관리자계정값(params);
  const 관리자 = new 관리자화면(page);
  const 헤더 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('로그인 요청으로 관리자 계정에 로그인한다', async () => {
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 「관리자」 링크가 보인다', await 헤더.관리자링크.isVisible(), true, { blocker: true });
    });

    await test.step('다른 요청 창에서 새 회원을 만들어 로그인해 둔 뒤 비밀번호를 다섯 번 틀린다', async () => {
      await 임시회원가입(request, 회원);
      await API로그인(request, 회원.loginId, 회원.password);
      await 틀린로그인(request, 회원.loginId, 5);
    });

    await test.step('비밀번호 5회 실패로 잠긴 새 회원이 있는지 확인한다', async () => {
      const 응답 = await 로그인요청(request, 회원.loginId, 회원.password);
      await verify('잠긴 회원은 맞는 비밀번호로 로그인 요청을 보내도 423 으로 응답한다', 응답.status(), 423, { blocker: true });
    });

    await test.step('회원 관리 표의 「아이디」 칸 제목을 누른다', async () => {
      await 관리자.회원관리열기();
      await 관리자.칸제목('아이디').getByRole('button').click();
      await verify(
        '칸 제목을 누르면 아이디 오름차순으로 정렬되고 제목 옆에 「▲」가 보인다',
        { 정렬: await 관리자.칸제목('아이디').getAttribute('aria-sort'), 제목: (await 관리자.칸제목('아이디').innerText()).trim() },
        { 정렬: 'ascending', 제목: '아이디 ▲' },
      );
    });

    await test.step('「아이디」 칸 제목을 다시 누른다', async () => {
      await 관리자.칸제목('아이디').getByRole('button').click();
      await verify(
        '다시 누르면 아이디 내림차순으로 정렬되고 「▼」가 보인다',
        { 정렬: await 관리자.칸제목('아이디').getAttribute('aria-sort'), 제목: (await 관리자.칸제목('아이디').innerText()).trim() },
        { 정렬: 'descending', 제목: '아이디 ▼' },
      );
    });

    await test.step('잠긴 회원 줄의 「잠금 해제」를 누른다', async () => {
      await 관리자.아이디검색칸.fill(회원.loginId);
      const 줄 = 관리자.회원줄(회원.loginId);
      await 줄.waitFor();
      await 관리자.잠금해제버튼(줄).click();
      await 알림.기다리기('잠금이 해제되었습니다');
      await verify(
        '「잠금 해제」를 누르면 그 회원의 잠금이 풀려 상태가 바뀐다',
        { 정상: (await 줄.innerText()).includes('정상'), 해제버튼보임: await 관리자.잠금해제버튼(줄).isVisible() },
        { 정상: true, 해제버튼보임: false },
      );
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});
