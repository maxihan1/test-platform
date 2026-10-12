import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 로그인해있나, 정리함만들기, 관리자값 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-110',
  name: '관리자가 연 다른 회원 글 상세에 「수정」 버튼이 보인다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = 관리자값(params);
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('다른 회원이 글을 쓰고 관리자 계정으로 로그인한다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '관리자글')).id;
      await API로그인(page.request, 관리자.loginId, 관리자.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('다른 회원이 쓴 글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await verify('관리자가 연 다른 회원 글 상세에 「수정」 버튼이 보인다', await 상세.수정.isVisible(), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
