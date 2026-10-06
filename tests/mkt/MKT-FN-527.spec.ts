import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './components/account.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-527',
  name: '관리자의 분류 선택 상자에는 「공지」가 있다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    if (!params.adminPassword) throw new Error('관리자 비밀번호가 없다');
    await API로그인(page.request, params.adminLoginId, params.adminPassword);
  });

  await test.step('관리자로 글쓰기 화면의 분류 선택 상자를 연다', async () => {
    await 안내창끄기(page);
    await 쓰기.열기();
    await verify('글쓰기 화면이 열린다', await 쓰기.제목글.isVisible(), true, { blocker: true });
    await verify('관리자의 분류 선택 상자에는 「공지」가 있다', (await 쓰기.분류글자들읽기()).includes('공지'), true);
  });
});
