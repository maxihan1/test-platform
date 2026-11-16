import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 화면글정확 } from './helpers/compose-flow.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-350',
  name: '검색어를 적고 완료 키를 치면 결과가 「게시물」 · 「해시태그」 · 「사람」 탭으로 나뉘어 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('검색에 적을 낱말').default('카페'),
  }),
  expected: z.object({
    게시물: z.string().describe('결과 탭 글자').default('게시물'),
    해시태그: z.string().describe('결과 탭 글자').default('해시태그'),
    사람: z.string().describe('결과 탭 글자').default('사람'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('검색에 「카페」를 적고 완료 키를 친다', async () => {
    await 검색.적기(params.검색어);
    await 검색.완료키();
    const 게시물 = await verify('「게시물」 탭이 보인다', await 뜰때까지(driver, 화면글정확(expected.게시물), 15_000), true);
    const 해시태그 = await verify('「해시태그」 탭이 보인다', await 뜰때까지(driver, 화면글정확(expected.해시태그), 15_000), true);
    const 사람 = await verify('「사람」 탭이 보인다', await 뜰때까지(driver, 화면글정확(expected.사람), 15_000), true);
    await verify('검색어를 적고 완료 키를 치면 결과가 「게시물」 · 「해시태그」 · 「사람」 탭으로 나뉘어 보인다', 게시물 && 해시태그 && 사람, true);
  });
});
