import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './components/account.component.js';
import { 시드글번호 } from './components/board-helpers.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-526',
  name: '관리자가 남의 글 상세를 열면 「삭제」만 보이고 「수정」은 보이지 않는다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호가 실행 환경에 없다(테스트 계정은 회원 하나다)',
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    if (!params.adminPassword) throw new Error('관리자 비밀번호가 없다');
    await API로그인(page.request, params.adminLoginId, params.adminPassword);
  });

  await test.step('남이 쓴 게시글 상세를 연다', async () => {
    await 안내창끄기(page);
    await 상세.열기(await 시드글번호(page.request));
    await verify('남이 쓴 글 상세에 좋아요 버튼이 보인다', await 상세.좋아요버튼.isVisible(), true, { blocker: true });
    await verify(
      '관리자가 남의 글 상세를 열면 「삭제」만 보이고 「수정」은 보이지 않는다',
      { 삭제: await 상세.삭제버튼.isVisible(), 수정: await 상세.수정링크.isVisible() },
      { 삭제: true, 수정: false },
    );
  });
});
