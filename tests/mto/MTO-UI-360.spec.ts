import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-360',
  name: '계정 상세에 표시 이름 · @아이디와 카운터 「게시물」 · 「첨부된 미디어」 · 「팔로워」 · 「이 계정에서 제출된 신고」 · 「이 계정에 대한 신고」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_user2 계정 상세를 연다', async () => {
    await 상세.열기(await 계정번호(page, 'qa_user2'));
    const 이름 = await verify('표시 이름이 보인다', await 상세.표시이름.isVisible(), true);
    const 아이디 = await verify('@아이디가 보인다', await 상세.프로필아이디.isVisible(), true);
    const 게시물 = await verify('카운터 「게시물」이 보인다', await 상세.카운터링크('게시물').isVisible(), true);
    const 미디어 = await verify('카운터 「첨부된 미디어」가 보인다', await 상세.카운터링크('첨부된 미디어').isVisible(), true);
    const 팔로워 = await verify('카운터 「팔로워」가 보인다', await 상세.카운터링크('팔로워').isVisible(), true);
    const 제출 = await verify('카운터 「이 계정에서 제출된 신고」가 보인다', await 상세.카운터링크('이 계정에서 제출된 신고').isVisible(), true);
    const 대한 = await verify('카운터 「이 계정에 대한 신고」가 보인다', await 상세.카운터링크('이 계정에 대한 신고').isVisible(), true);
    await verify('계정 상세에 표시 이름 · @아이디와 카운터 「게시물」 · 「첨부된 미디어」 · 「팔로워」 · 「이 계정에서 제출된 신고」 · 「이 계정에 대한 신고」가 보인다', 이름 && 아이디 && 게시물 && 미디어 && 팔로워 && 제출 && 대한, true);
  });
});
