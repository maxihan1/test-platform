import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션목록화면 } from './pages/collections.page.js';
import { 컬렉션상세화면 } from './pages/collection-detail.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-216',
  name: '남의 컬렉션에 「이 컬렉션 신고」 · 「계정 차단」이 보인다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 컬렉션목록화면(page);
  const 상세 = new 컬렉션상세화면(page);
  let 주인 = '';

  await test.step('일반 회원의 아이디를 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    주인 = (await 내계정API(page)).acct;
    await verify('일반 회원의 아이디가 확인된다', 주인 !== '', true, { blocker: true });
  });

  await test.step('두 번째 사용자로 로그인하고 일반 회원의 컬렉션 목록을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 목록.열기(주인);
    await 목록.링크그려질때까지('좋아하는 사진가');
    await verify('컬렉션 목록에 「좋아하는 사진가」가 보인다', await 목록.링크('좋아하는 사진가').isVisible(), true, { blocker: true });
  });

  await test.step('두 번째 사용자로 일반 회원의 「좋아하는 사진가」 컬렉션을 연다', async () => {
    await 목록.링크('좋아하는 사진가').click();
    await 상세.그려질때까지();
    await 상세.메뉴열기();
    const 신고 = await verify('「이 컬렉션 신고」가 보인다', await 상세.펼침.항목('이 컬렉션 신고').isVisible(), true);
    const 차단 = await verify('「계정 차단」이 보인다', await 상세.계정차단().isVisible(), true);
    await verify('남의 컬렉션에 「이 컬렉션 신고」 · 「계정 차단」이 보인다', 신고 && 차단, true);
  });
});
