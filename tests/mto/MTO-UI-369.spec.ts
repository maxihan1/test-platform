import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공개글고르기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정게시물화면 } from './pages/account-statuses.page.js';
import { 게시물상세화면 } from './pages/status-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-369',
  name: '게시물 상세에 내용 · 「버전 이력」 · 「메타데이터」 · 「공개 설정」 · 「좋아요」 · 「리블로그」 · 「인용」과 「게시물 열기」 · 「공개시점으로 보기」 링크가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', 'qa_user2 에게 답글도 개인 멘션도 아닌 게시물이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 게시 = new 계정게시물화면(page);
  const 게시물 = new 게시물상세화면(page);
  let 계정 = '';
  let 글 = '';

  await test.step('Owner 계정으로 로그인하고 qa_user2 의 답글도 개인 멘션도 아닌 게시물을 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    계정 = await 계정번호(page, 'qa_user2');
    글 = await 공개글고르기(page, 'qa_user2');
    await verify('qa_user2 에게 답글도 개인 멘션도 아닌 게시물이 있다', 글 !== '', true, { blocker: true });
  });

  await test.step('「계정 게시물 - @qa_user2」에서 게시물 행을 누른다', async () => {
    await 게시.열기(계정);
    await 게시.그려질때까지();
    await 게시.게시물시각링크(글).click();
    await 게시물.그려질때까지();
    const 내용 = await verify('내용이 보인다', await 게시물.내용.isVisible(), true);
    const 이력 = await verify('「버전 이력」이 보인다', await 게시물.버전이력.isVisible(), true);
    const 메타 = await verify('「메타데이터」가 보인다', await 게시물.메타데이터.isVisible(), true);
    const 항목 = await verify('「공개 설정」 · 「좋아요」 · 「리블로그」 · 「인용」이 보인다', await 게시물.메타데이터항목글(), '공개 설정, 리블로그, 인용, 좋아요');
    const 열기 = await verify('「게시물 열기」 링크가 보인다', await 게시물.게시물열기.isVisible(), true);
    const 시점 = await verify('「공개시점으로 보기」 링크가 보인다', await 게시물.공개시점으로보기.isVisible(), true);
    await verify('게시물 상세에 내용 · 「버전 이력」 · 「메타데이터」 · 「공개 설정」 · 「좋아요」 · 「리블로그」 · 「인용」과 「게시물 열기」 · 「공개시점으로 보기」 링크가 보인다', 내용 && 이력 && 메타 && 항목 && 열기 && 시점, true);
  });
});
