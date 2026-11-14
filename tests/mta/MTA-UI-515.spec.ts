import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-515',
  name: '영상 미디어 뷰어에 「재생」/「일시정지」와 진행 막대가 보인다',
  platforms: ['android'],
  held: '보류 — 영상이 붙은 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    영상글본문: z.string().describe('영상이 붙은 글 본문의 한 조각'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 뷰어 = new 미디어뷰어화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('영상 글의 영상을 누른다', async () => {
    await 뷰어.글열기(params.영상글본문);
    await 프로필.사진누르기();
    await verify('영상 미디어 뷰어에 「재생」/「일시정지」와 진행 막대가 보인다', (await 뷰어.글자보이나('재생', 4_000)) || (await 뷰어.글자보이나('일시정지', 4_000)), true);
  }, { capture: true });
});
