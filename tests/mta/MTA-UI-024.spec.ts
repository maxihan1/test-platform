import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-024',
  name: '가입용 서버 고르기 화면에 「모든 언어」 · 「모든 가입 속도-어떠한 가입 속도」 · 「일반」 · 「특별한 관심사」 · 지역 필터 칩이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입용 서버 고르기 화면의 필터 칩을 확인한다', async () => {
    const 칩들 = await 고르기.칩글자모으기();
    const 언어 = await verify('「모든 언어」 칩이 보인다', 칩들.includes('모든 언어'), true);
    const 속도 = await verify('「모든 가입 속도-어떠한 가입 속도」 칩이 보인다', 칩들.includes('모든 가입 속도-어떠한 가입 속도'), true);
    const 일반 = await verify('「일반」 칩이 보인다', 칩들.includes('일반'), true);
    const 관심사 = await verify('「특별한 관심사」 칩이 보인다', 칩들.includes('특별한 관심사'), true);
    const 지역 = await verify('지역 필터 칩이 보인다', 칩들.length >= 5, true);
    await verify(
      '가입용 서버 고르기 화면에 「모든 언어」 · 「모든 가입 속도-어떠한 가입 속도」 · 「일반」 · 「특별한 관심사」 · 지역 필터 칩이 보인다',
      언어 && 속도 && 일반 && 관심사 && 지역,
      true,
    );
  });
});
