import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-099',
  name: '관리자가 연 남의 글 상세에는 「삭제」만 보이고 「수정」은 보이지 않는다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  held: '보류 — 관리자 계정 비밀번호가 테스트 계정 환경 변수에 없다',
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 남!: 둘째회원;
  let 글번호 = 0;

  await 방해막기(page);
  try {
    await test.step('다른 회원이 글을 쓰고 관리자 계정으로 로그인한다', async () => {
      남 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(남));
      글번호 = (await 글하나쓰기(남.api, '남의글')).id;
      const 계정 = 관리자값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
    });

    await test.step('다른 회원이 쓴 글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await verify(
        '관리자가 연 남의 글 상세에는 「삭제」만 보이고 「수정」은 보이지 않는다',
        { 삭제: await 상세.삭제.isVisible(), 수정: await 상세.수정.isVisible() },
        { 삭제: true, 수정: false },
      );
    });
  } finally {
    await API로그아웃(page.request);
    await 정리.모두하기();
  }
});
