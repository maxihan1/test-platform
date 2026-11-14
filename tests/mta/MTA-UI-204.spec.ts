import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 글읽기, 글자요소가보이나, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-204',
  name: '공개 범위 버튼은 시트 「공개 범위 및 상호작용」을 열고 「공개」 · 「제한적 공개」 · 「팔로워」 · 「개인 멘션」, 인용 가능한 사용자 「모든 사용자」 · 「팔로워만」 · 「본인만」, 「취소」 · 「저장」이 보인다',
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
  const 글쓰기 = new 글쓰기화면(driver);
  const 공개시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기 공개 범위 버튼을 누른다', async () => {
      await 글쓰기.공개범위누르기();
      await verify('공개 범위 시트가 뜬다', await 공개시트.떴나(), true, { blocker: true });
      const 제목 = await verify('시트 제목이 「공개 범위 및 상호작용」이다', await 문구가보이나(driver, '공개 범위 및 상호작용'), true);
      const 취소 = await verify('시트에 「취소」가 보인다', await 글읽기(driver, 공개시트.취소), '취소');
      const 저장 = await verify('시트에 「저장」이 보인다', await 글읽기(driver, 공개시트.저장), '저장');
      await 공개시트.공개범위열기();
      const 공개 = await verify('공개 범위 선택지에 「공개」가 보인다', await 글자요소가보이나(driver, '공개'), true);
      const 제한 = await verify('공개 범위 선택지에 「제한적 공개」가 보인다', await 글자요소가보이나(driver, '제한적 공개'), true);
      const 팔로워 = await verify('공개 범위 선택지에 「팔로워」가 보인다', await 글자요소가보이나(driver, '팔로워'), true);
      const 멘션 = await verify('공개 범위 선택지에 「개인 멘션」이 보인다', await 글자요소가보이나(driver, '개인 멘션'), true);
      await 뒤로(driver);
      await 공개시트.인용정책열기();
      const 모두 = await verify('인용 가능한 사용자 선택지에 「모든 사용자」가 보인다', await 글자요소가보이나(driver, '모든 사용자'), true);
      const 팔로워만 = await verify('인용 가능한 사용자 선택지에 「팔로워만」이 보인다', await 글자요소가보이나(driver, '팔로워만'), true);
      const 본인만 = await verify('인용 가능한 사용자 선택지에 「본인만」이 보인다', await 글자요소가보이나(driver, '본인만'), true);
      await verify('공개 범위 버튼은 시트 「공개 범위 및 상호작용」을 열고 「공개」 · 「제한적 공개」 · 「팔로워」 · 「개인 멘션」, 인용 가능한 사용자 「모든 사용자」 · 「팔로워만」 · 「본인만」, 「취소」 · 「저장」이 보인다', 제목 && 취소 && 저장 && 공개 && 제한 && 팔로워 && 멘션 && 모두 && 팔로워만 && 본인만, true);
      await 뒤로(driver);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
