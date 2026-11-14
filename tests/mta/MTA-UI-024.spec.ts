import { defineCase, test, verify } from '@platform/kit';

import { 뒤로 } from './helpers/app.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-024',
  name: '가입 경로 서버 고르기에 언어(「모든 언어」) · 가입 속도(「모든 가입 속도-어떠한 가입 속도」 · 「즉시 가입」 · 「수동 검토」) · 「일반」 · 「특별한 관심사」 · 지역 필터 칩이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('시작 화면에서 「다른 서버 선택하기」를 누른다', async () => {
    await 시작.누르기('다른서버선택');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
    const 언어 = await verify('「모든 언어」 칩이 보인다', await 서버화면.글자가보이나('모든 언어'), true);
    const 속도 = await verify('「모든 가입 속도-어떠한 가입 속도」 칩이 보인다', await 서버화면.글자가보이나('모든 가입 속도-어떠한 가입 속도'), true);
    const 일반 = await verify('「일반」 칩이 보인다', await 서버화면.글자가보이나('일반'), true);
    await 서버화면.칩누르기('모든 가입 속도-어떠한 가입 속도');
    const 즉시 = await verify('「즉시 가입」이 보인다', await 서버화면.글자가보이나('즉시 가입'), true);
    const 수동 = await verify('「수동 검토」가 보인다', await 서버화면.글자가보이나('수동 검토'), true);
    await 뒤로(driver);
    await 서버화면.필터줄밀기();
    const 관심사 = await verify('「특별한 관심사」 칩이 보인다', await 서버화면.글자가보이나('특별한 관심사'), true);
    const 지역 = await verify('지역 칩이 보인다', await 서버화면.글자가보이나('지역'), true);
    await verify('가입 경로 서버 고르기에 언어(「모든 언어」) · 가입 속도(「모든 가입 속도-어떠한 가입 속도」 · 「즉시 가입」 · 「수동 검토」) · 「일반」 · 「특별한 관심사」 · 지역 필터 칩이 보인다', 언어 && 속도 && 즉시 && 수동 && 일반 && 관심사 && 지역, true);
  }, { capture: true });
});
