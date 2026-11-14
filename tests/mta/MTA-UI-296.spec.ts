import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그타임라인화면 } from './pages/hashtag-timeline.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-296',
  name: '해시태그 타임라인에 제목 #<태그> · 지난 일주일 요약(「게시물 n개」 · 「n명의 참여자」 · 「오늘 게시한 n명」) · 「팔로우」 / 「팔로잉」 버튼이 보인다',
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
  const 태그 = new 해시태그타임라인화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('#오늘의사진 해시태그 타임라인을 연다', async () => {
    await 태그.홈에서열기('#오늘의사진');
    const 판정1 = await verify('해시태그 타임라인 제목 #<태그>가 보인다', await 태그.글자보이나('#오늘의사진'), true);
    const 판정2 = await verify('지난 일주일 요약 「게시물 n개」가 보인다', await 문구가보이나(driver, '게시물 n개'), true);
    const 판정3 = await verify('지난 일주일 요약 「n명의 참여자」가 보인다', await 문구가보이나(driver, 'n명의 참여자'), true);
    const 판정4 = await verify('지난 일주일 요약 「오늘 게시한 n명」이 보인다', await 문구가보이나(driver, '오늘 게시한 n명'), true);
    const 판정5 = await verify('「팔로우」 / 「팔로잉」 버튼이 보인다', (await 태그.글자보이나('팔로잉')) || (await 태그.글자보이나('팔로우')), true);
    await verify('해시태그 타임라인에 제목 #<태그> · 지난 일주일 요약(「게시물 n개」 · 「n명의 참여자」 · 「오늘 게시한 n명」) · 「팔로우」 / 「팔로잉」 버튼이 보인다', 판정1 && 판정2 && 판정3 && 판정4 && 판정5, true);
  }, { capture: true });
});
