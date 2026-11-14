import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자들 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-279',
  name: '둘러보기 「소식」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.」와 유행 링크 카드가 보인다',
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
  const 탐색 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('둘러보기에서 「소식」 탭을 누른다', async () => {
    await 탐색.열기();
    await 탐색.탭누르기('소식');
    await verify('둘러보기 「소식」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.」와 유행 링크 카드가 보인다', (await 글자들(driver, 탐색.배너)).join(', '), '당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.');
  }, { capture: true });
});
