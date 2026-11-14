import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 글자있나 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-550',
  name: '미디어를 다운로드하면 「다운로드 중…」 뒤 스낵바 「이미지 저장됨」 / 「비디오 저장됨」 + 「보기」가 보이고 실패하면 「파일 저장 오류」가 보인다',
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
  const 프로필 = new 프로필화면(driver);
  const 뷰어 = new 미디어뷰어화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('미디어 뷰어에서 「다운로드」를 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 프로필.사진누르기();
    await 뷰어.떴나();
    await 뷰어.다운로드누르기();
    const 판정1 = await verify('스낵바 「이미지 저장됨」이 보인다', await 뷰어.글자보이나('이미지 저장됨'), true);
    const 판정2 = await verify('스낵바에 「보기」 버튼이 보인다', await 글자있나(driver, '보기', 5_000), true);
    await verify('미디어를 다운로드하면 「다운로드 중…」 뒤 스낵바 「이미지 저장됨」 / 「비디오 저장됨」 + 「보기」가 보이고 실패하면 「파일 저장 오류」가 보인다', 판정1 && 판정2, true);
  }, { capture: true });
});
