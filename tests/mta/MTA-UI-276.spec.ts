import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-276',
  name: '둘러보기에 탭 「게시물」 · 「해시태그」 · 「소식」 · 「추천」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('하단 「둘러보기」 탭을 누른다', async () => {
    await verify('둘러보기 화면이 열린다', await 둘러보기.열기(), true, { blocker: true });
    const 게시물 = await verify('「게시물」 탭이 보인다', await 뜰때까지(driver, 둘러보기.탭이름('게시물'), 10_000), true);
    const 해시태그 = await verify('「해시태그」 탭이 보인다', await 뜰때까지(driver, 둘러보기.탭이름('해시태그'), 10_000), true);
    const 소식 = await verify('「소식」 탭이 보인다', await 뜰때까지(driver, 둘러보기.탭이름('소식'), 10_000), true);
    const 추천 = await verify('「추천」 탭이 보인다', await 뜰때까지(driver, 둘러보기.탭이름('추천'), 10_000), true);
    await verify('둘러보기에 탭 「게시물」 · 「해시태그」 · 「소식」 · 「추천」이 보인다', 게시물 && 해시태그 && 소식 && 추천, true);
  });
});
