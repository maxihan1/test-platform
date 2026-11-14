import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션상세화면 } from './pages/collection-detail.page.js';
import { 컬렉션목록화면 } from './pages/collections.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-648',
  name: '내 컬렉션을 열면 「이 컬렉션 신고」가 보이지 않는다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 컬렉션목록화면(page);
  const 상세 = new 컬렉션상세화면(page);
  let 내아이디 = '';

  await test.step('일반 회원으로 로그인하고 내 컬렉션 목록을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    내아이디 = (await 내계정API(page)).acct;
    await 목록.열기(내아이디);
    await 목록.링크그려질때까지('좋아하는 사진가');
    await verify('컬렉션 목록에 「좋아하는 사진가」가 보인다', await 목록.링크('좋아하는 사진가').isVisible(), true, { blocker: true });
  });

  await test.step('일반 회원으로 내 「좋아하는 사진가」 컬렉션을 연다', async () => {
    await 목록.링크('좋아하는 사진가').click();
    await 상세.그려질때까지();
    await 상세.메뉴열기();
    await verify('내 컬렉션을 열면 「이 컬렉션 신고」가 보이지 않는다', await 상세.펼침.항목('이 컬렉션 신고').isVisible(), false);
  });
});
