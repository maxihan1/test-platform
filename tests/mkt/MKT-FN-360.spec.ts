import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기, 테스트계정값 } from './components/account.component.js';
import { 내주문번호들 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-360',
  name: '남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '테스트 계정의 주문 번호를 안다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, request, params }) => {
  const 계정 = 테스트계정값(params);
  const 상세 = new 주문상세화면(page);
  const 헤더 = new 머리글(page);
  const 회원 = 임시회원정보();
  let 남의주문 = '';

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(page.request, 회원);
      await API로그인(page.request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('다른 요청 창에서 테스트 계정으로 로그인해 주문 번호를 읽어 둔다', async () => {
      await API로그인(request, 계정.loginId, 계정.password);
      남의주문 = (await 내주문번호들(request))[0] ?? '';
    });

    await test.step('테스트 계정의 주문 번호가 있는지 확인한다', async () => {
      await verify('테스트 계정의 주문 번호를 읽었다', 남의주문 !== '', true, { blocker: true });
    });

    await test.step('테스트 계정 주문의 상세 주소를 연다', async () => {
      await 상세.열기(남의주문);
      await 상세.권한없음제목.or(상세.배송제목).waitFor();
      await verify('남의 주문 번호로 주문 상세에 들어가면 「권한이 없습니다」가 보인다', await 상세.권한없음제목.isVisible(), true);
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});
