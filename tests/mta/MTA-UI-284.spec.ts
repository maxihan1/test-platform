import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 앱다시켜기 } from './helpers/app.helper.js';
import { 글자누르기, 글자있나 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-284',
  name: '검색 입력이 비어 있으면 최근 검색(제목 「최근앱」 · 「모두 지우기」)이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('검색어를 하나 찾아 열어 최근 검색을 남긴다', async () => {
    await 검색.열기();
    await 검색.검색하기('hana');
    await 검색.탭누르기('사람');
    await 검색.줄누르기('hana_photo');
    await 앱다시켜기(driver);
    await 홈.떴나(60_000);
  });

  await test.step('둘러보기 검색창을 누르고 입력을 비워 둔다', async () => {
    try {
      await 검색.열기();
      const 판정1 = await verify('최근 검색 제목 「최근앱」이 보인다', await 문구가보이나(driver, '최근앱'), true);
      const 판정2 = await verify('최근 검색에 「모두 지우기」가 보인다', await 문구가보이나(driver, '모두 지우기'), true);
      await verify('검색 입력이 비어 있으면 최근 검색(제목 「최근앱」 · 「모두 지우기」)이 보인다', 판정1 && 판정2, true);
    } finally {
      if (await 글자있나(driver, '모두 지우기', 3_000)) {
        await 글자누르기(driver, '모두 지우기');
      }
    }
  }, { capture: true });
});
