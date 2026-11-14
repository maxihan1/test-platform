import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-300',
  name: '해시태그 관리 화면(제목 「해시태그 관리」) 줄마다 #태그 · 「n 개 최신 게시물」 · 해제 버튼이 보인다',
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
  const 관리 = new 해시태그관리화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('홈 드롭다운 「팔로우 중인 해시태그」에서 「해시태그 관리」를 누른다', async () => {
    await 관리.열기();
    const 판정1 = await verify('해시태그 관리 화면 제목 「해시태그 관리」가 보인다', await 문구가보이나(driver, '해시태그 관리'), true);
    const 판정2 = await verify('줄에 #태그 「#오늘의사진」이 보인다', await 관리.글자보이나('#오늘의사진'), true);
    const 판정3 = await verify('줄에 「n 개 최신 게시물」이 보인다', await 문구가보이나(driver, 'n 개 최신 게시물'), true);
    const 판정4 = await verify('줄마다 해제 버튼이 보인다', (await 관리.해제버튼수()) >= 1, true);
    await verify('해시태그 관리 화면(제목 「해시태그 관리」) 줄마다 #태그 · 「n 개 최신 게시물」 · 해제 버튼이 보인다', 판정1 && 판정2 && 판정3 && 판정4, true);
  }, { capture: true });
});
