import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 공유창이닫혔나, 글공유보내기 } from './helpers/onboarding.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-632',
  name: '로그인 계정이 없을 때 공유받기로 들어오면 토스트 「먼저 마스토돈에 로그인해야 합니다」 뒤 닫힌다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 알림창 = new 토스트(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 없이 앱에 글 공유를 보낸다', async () => {
    await 글공유보내기(driver, 'mta_share');
    const 알림 = await verify('「먼저 마스토돈에 로그인해야 합니다」 토스트가 보인다', (await 알림창.글(15_000)).includes('먼저 마스토돈에 로그인해야 합니다'), true);
    const 닫힘 = await verify('공유 창이 닫힌다', await 공유창이닫혔나(driver), true);
    await verify('로그인 계정이 없을 때 공유받기로 들어오면 토스트 「먼저 마스토돈에 로그인해야 합니다」 뒤 닫힌다', 알림 && 닫힘, true);
  }, { capture: true });
});
