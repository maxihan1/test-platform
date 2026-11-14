import { defineCase, test, verify } from '@platform/kit';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 가입서버고르기 } from './helpers/onboarding.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-043',
  name: '서버 규칙 화면에 제목 「서버 규칙」 · 안내 「계속 진행하는 것으로 <서버>의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」 · 「동의합니다」 · 「동의 안 함」이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);
  const 규칙 = new 서버규칙화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 「다음」을 누른다', async () => {
    await 가입서버고르기(driver);
    await 서버화면.다음누르기();
    await verify('서버 규칙 화면이 보인다', await 규칙.떴나(), true, { blocker: true });
    const 제목 = await verify('화면 제목이 「서버 규칙」이다', await 규칙.제목이보이나(), true);
    const 안내 = await verify('안내 「계속 진행하는 것으로 <서버>의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」가 보인다', await 문구가보이나(driver, '계속 진행하는 것으로 <서버>의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.'), true);
    const 동의 = await verify('「동의합니다」 버튼이 보인다', await 규칙.동의글(), '동의합니다');
    const 거부 = await verify('「동의 안 함」 버튼이 보인다', await 규칙.동의안함글(), '동의 안 함');
    await verify('서버 규칙 화면에 제목 「서버 규칙」 · 안내 「계속 진행하는 것으로 <서버>의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」 · 「동의합니다」 · 「동의 안 함」이 보인다', 제목 && 안내 && 동의 && 거부, true);
  }, { capture: true });
});
