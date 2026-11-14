import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';
import { 해시태그타임라인화면 } from './pages/hashtag-timeline.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-302',
  name: '해시태그 관리 줄을 누르면 해시태그 타임라인이 열린다',
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
  const 태그 = new 해시태그타임라인화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('해시태그 관리 줄을 누른다', async () => {
    await 관리.열기();
    await 관리.줄누르기('#오늘의사진');
    const 판정1 = await verify('해시태그 타임라인에 지난 일주일 요약 「게시물 n개」가 보인다', await 문구가보이나(driver, '게시물 n개'), true);
    const 판정2 = await verify('해시태그 타임라인에 「팔로잉」 버튼이 보인다', await 태그.글자보이나('팔로잉'), true);
    await verify('해시태그 관리 줄을 누르면 해시태그 타임라인이 열린다', 판정1 && 판정2, true);
  }, { capture: true });
});
