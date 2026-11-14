import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앞에뜬앱이될때까지, 요청권한들, 큐알스캔열기 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-561',
  name: '로그인해 홈까지 가면 앱은 카메라 · 마이크 · 위치 권한을 요청하지 않고 QR 스캔은 Google Play 서비스 스캐너가 처리한다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인해 홈까지 간다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
    const 권한 = await 요청권한들(driver);
    const 카메라 = await verify('카메라 권한을 요청하지 않는다', 권한.includes('android.permission.CAMERA'), false);
    const 마이크 = await verify('마이크 권한을 요청하지 않는다', 권한.includes('android.permission.RECORD_AUDIO'), false);
    const 위치 = await verify('위치 권한을 요청하지 않는다', 권한.some((이름) => 이름.includes('LOCATION')), false);
    await 큐알스캔열기(driver);
    const 스캐너 = await verify('QR 스캔 화면이 Google Play 서비스에서 열린다', await 앞에뜬앱이될때까지(driver, 'com.google.android.gms'), true);
    await verify('로그인해 홈까지 가면 앱은 카메라 · 마이크 · 위치 권한을 요청하지 않고 QR 스캔은 Google Play 서비스 스캐너가 처리한다', 카메라 && 마이크 && 위치 && 스캐너, true);
  }, { capture: true });
});
