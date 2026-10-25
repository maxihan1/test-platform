import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버주소로켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-063',
  name: '닿지 않는 서버로 켠 앱에서 두 칸을 비우고 로그인하면 「서버에 연결할 수 없습니다」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['server 값으로 폰에서 닿지 않는 주소를 넘겨 앱을 켠 상태다'],
  params: z.object({
    닿지않는주소: z.string().describe('server 값으로 넘길 주소 — 폰에서 열리지 않는 http 주소').default('http://127.0.0.1:1'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('server 값으로 닿지 않는 주소를 넘겨 앱을 켠다', async () => {
    await 서버주소로켜기(driver, params.닿지않는주소);
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('두 칸을 비운 채 「로그인」을 누른다', async () => {
    await 로그인.로그인누르기();
    const 안내 = await 로그인.안내글();
    await verify(
      '닿지 않는 서버로 켠 앱에서 두 칸을 비우고 로그인하면 「서버에 연결할 수 없습니다」가 보이지 않는다',
      안내.startsWith('서버에 연결할 수 없습니다'),
      false,
    );
  }, { capture: true });
});
