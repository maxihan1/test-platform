import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 토스트 } from './components/toast.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-639',
  name: '재생할 수 없는 영상을 열면 영상 재생 오류는 토스트 「비디오 재생 오류 발생」, 이미지 실패는 「이미지를 불러올 수 없습니다」다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  held: '보류 — 재생할 수 없는 영상 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    재생불가영상글: z.string().describe('재생할 수 없는 영상이 붙은 글 본문의 한 조각'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 뷰어 = new 미디어뷰어화면(driver);
  const 토스트창 = new 토스트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('재생할 수 없는 영상을 연다', async () => {
    await 뷰어.글열기(params.재생불가영상글);
    await 프로필.사진누르기();
    await verify('재생할 수 없는 영상을 열면 영상 재생 오류는 토스트 「비디오 재생 오류 발생」, 이미지 실패는 「이미지를 불러올 수 없습니다」다', await 토스트창.글(), '비디오 재생 오류 발생');
  }, { capture: true });
});
