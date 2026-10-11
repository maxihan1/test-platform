import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값, 글쓴이정리하기, 글있나, 글하나쓰기, 세션역할, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-426',
  name: '관리자가 연 다른 회원 글 상세에는 「삭제」만 보이고 「수정」은 보이지 않는다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호',
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 정리 = 정리함만들기();
  const 관리자 = 관리자값(params);
  let 글쓴!: 글쓴이;
  let 글번호 = 0;
  await 방해막기(page);

  try {
    await test.step('다른 회원이 글을 쓰고 관리자 계정으로 로그인한다', async () => {
      글쓴 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(글쓴));
      글번호 = (await 글하나쓰기(글쓴.api, '관리자글')).id;
      await API로그인(page.request, 관리자.loginId, 관리자.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 세션역할(page.request), 'admin', { blocker: true });
      await verify('다른 회원이 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
    });

    await test.step('다른 회원이 쓴 글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await 상세.그려질때까지();
      await verify('관리자가 연 다른 회원 글 상세에는 「삭제」만 보이고 「수정」은 보이지 않는다', (await 상세.삭제.isVisible()) && !(await 상세.수정.isVisible()), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
