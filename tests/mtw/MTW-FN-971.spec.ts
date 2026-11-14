import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-971',
  name: '내 글의 낱말로 검색하면 「게시물」 탭에 「결과가 없습니다.」가 보인다',
  precondition: ['일반 회원이 쓴 새 글이 있다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 검색 = new 검색화면(page);
  const 낱말 = 표식('search');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 검색할 낱말이 든 새 글을 쓴다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    글번호 = (await 글쓰기API(page, { status: `검색 확인 ${낱말}`, visibility: 'public' })).id;
    await verify('새 글이 만들어졌다', 글번호.length > 0, true, { blocker: true });
  });

  try {
    await test.step('내 글의 낱말로 검색해 「게시물」 탭을 연다', async () => {
      await 검색.열기(낱말);
      await 검색.탭('게시물').click();
      const 떴다 = await 검색.결과없음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('내 글의 낱말로 검색하면 「게시물」 탭에 「결과가 없습니다.」가 보인다', 떴다, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
