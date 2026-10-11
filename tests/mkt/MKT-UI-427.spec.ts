import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값, 세션역할, 정리함만들기 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-427',
  name: '관리자의 글쓰기 분류 드롭다운에는 「공지」가 보인다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호',
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 정리 = 정리함만들기();
  const 관리자 = 관리자값(params);
  await 방해막기(page);

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await API로그인(page.request, 관리자.loginId, 관리자.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 세션역할(page.request), 'admin', { blocker: true });
    });

    await test.step('글쓰기 화면을 연다', async () => {
      await 쓰기.열기();
      await 쓰기.준비될때까지();
      await verify('관리자의 글쓰기 분류 드롭다운에는 「공지」가 보인다', (await 쓰기.분류항목들()).includes('공지'), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
