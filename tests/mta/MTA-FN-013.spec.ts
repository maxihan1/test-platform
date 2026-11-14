import { defineCase, test, verify } from '@platform/kit';

import { 서버, 앱다시켜기, 클립보드에넣기 } from './helpers/app.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-013',
  name: '클립보드에 초대 링크가 있으면 기본 서버 버튼이 「<서버> 참여를 위해 초대하기」로 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('클립보드에 우리 서버 초대 링크를 넣고 앱을 다시 켠다', async () => {
    await 클립보드에넣기(driver, 'https://' + 서버 + '/invite/mtaclip123');
    await 앱다시켜기(driver);
    await verify('클립보드에 초대 링크가 있으면 기본 서버 버튼이 「<서버> 참여를 위해 초대하기」로 보인다', await 시작.기본서버버튼이('<서버> 참여를 위해 초대하기', 15_000), true);
  }, { capture: true });
});
