import { defineCase, test, verify } from '@platform/kit';
import { 권한창답하기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어 } from './pages/media-viewer.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-550',
  name: '미디어 뷰어에서 「다운로드」를 누르면 스낵바 「이미지 저장됨」과 「보기」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 뷰어 = new 미디어뷰어(driver);
  const 알림 = new 알림글(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('미디어 뷰어에서 「다운로드」를 누른다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 카드.사진누르기();
    await 뷰어.누르기('다운로드');
    await 권한창답하기(driver, '허용', 2_000);
    const 저장됨 = await verify('스낵바 「이미지 저장됨」이 보인다', await 알림.스낵바글(), '이미지 저장됨');
    const 보기 = await verify('「보기」가 보인다', await 뷰어.글자가뜰때까지('보기', 5_000), true);
    await verify('미디어 뷰어에서 「다운로드」를 누르면 스낵바 「이미지 저장됨」과 「보기」가 보인다', 저장됨 && 보기, true);
  });
});
