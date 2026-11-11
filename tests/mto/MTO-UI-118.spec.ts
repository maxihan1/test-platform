import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-118',
  name: 'spam_shop 신고 줄에 신고자 이름 · 사유 첫 줄 · 게시물 · 미디어 · 컬렉션 수와 할당된 중재자가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '미해결 spam_shop 신고 3건이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('미해결 spam_shop 신고 3건이 있다', await 목록.카드('spam_shop').isVisible(), true, { blocker: true });
  });

  await test.step('「신고」 화면을 연다', async () => {
    await 목록.열기();
    const 신고자 = await verify('신고자 이름이 3건 보인다', await 목록.신고자들('spam_shop').count(), 3);
    const 사유 = await verify('사유 첫 줄이 3건 보인다', await 목록.사유들('spam_shop').count(), 3);
    const 게시물 = await verify('게시물 수가 3건 보인다', await 목록.게시물수들('spam_shop').count(), 3);
    const 미디어 = await verify('미디어 수가 3건 보인다', await 목록.미디어수들('spam_shop').count(), 3);
    const 컬렉션 = await verify('컬렉션 수가 3건 보인다', await 목록.컬렉션수들('spam_shop').count(), 3);
    const 중재자 = await verify('할당된 중재자 qa_mod 가 보인다', await 목록.할당된중재자('spam_shop', 'qa_mod').isVisible(), true);
    await verify('spam_shop 신고 줄에 신고자 이름 · 사유 첫 줄 · 게시물 · 미디어 · 컬렉션 수와 할당된 중재자가 보인다', 신고자 && 사유 && 게시물 && 미디어 && 컬렉션 && 중재자, true);
  });
});
