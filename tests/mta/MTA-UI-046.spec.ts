import { defineCase, test, verify } from '@platform/kit';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 서버규칙까지 } from './helpers/onboarding.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 서버규칙화면 } from './pages/server-rules.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-046',
  name: '개인정보 화면에 제목 「당신의 개인정보」 · 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」 · 「Mastodon for Android Privacy Policy」 링크(부제 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」)가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 규칙 = new 서버규칙화면(driver);
  const 개인 = new 개인정보화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 서버 규칙 화면을 연다', async () => {
    await verify('서버 규칙 화면이 보인다', await 서버규칙까지(driver), true, { blocker: true });
  });
  await test.step('서버 규칙 화면에서 「동의합니다」를 누른다', async () => {
    await 규칙.동의누르기();
    await verify('개인정보 화면이 보인다', await 개인.떴나(), true, { blocker: true });
    const 제목 = await verify('화면 제목이 「당신의 개인정보」다', await 개인.글자가보이나('당신의 개인정보'), true);
    const 안내 = await verify('안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」가 보인다', await 문구가보이나(driver, '마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.'), true);
    const 링크 = await verify('「Mastodon for Android Privacy Policy」 링크가 보인다', await 개인.글자가보이나('Mastodon for Android Privacy Policy'), true);
    const 부제 = await verify('링크 부제 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다', await 개인.글자가보이나('요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.'), true);
    await verify('개인정보 화면에 제목 「당신의 개인정보」 · 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」 · 「Mastodon for Android Privacy Policy」 링크(부제 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」)가 보인다', 제목 && 안내 && 링크 && 부제, true);
  }, { capture: true });
});
