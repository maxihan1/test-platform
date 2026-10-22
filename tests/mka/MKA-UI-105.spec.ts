import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-105',
  name: '로그인 화면에서 「로그인」 버튼이 보이고 누를 수 있다',
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면에서 「로그인」 버튼을 확인한다', async () => {
    const 보임 = await verify('「로그인」 버튼이 보인다', await 로그인.로그인버튼보일때까지(), true);
    const 눌림 = await verify('「로그인」 버튼을 누를 수 있다', await 로그인.로그인버튼눌림(), 'true');
    await verify('로그인 화면에서 「로그인」 버튼이 보이고 누를 수 있다', 보임 && 눌림, true);
  }, { capture: true });
});
