import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본서버주소, 서버주소로켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-070',
  name: '로그인하는 동안 「로그인」 버튼은 눌리지 않는다',
  platforms: ['android'],
  precondition: ['앱을 응답이 오지 않는 서버 주소로 켰다'],
  params: z.object({
    serverAddress: z.string().describe('서버 주소 — 응답이 오지 않는 주소').default('http://10.255.255.1:3002'),
    userId: z.string().describe('아이디 — 아무 글자').default('user2'),
    userPass: z.string().describe('비밀번호 — 아무 글자').default('wrong1234'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  try {
    await test.step('앱을 응답이 오지 않는 서버 주소로 켠다', async () => {
      await 서버주소로켜기(driver, params.serverAddress);
      await 로그인.열릴때까지().catch(() => undefined);
      await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
    });

    await test.step('아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      await 로그인.로그인(params.userId, params.userPass);
      await verify('로그인하는 동안 「로그인」 버튼은 눌리지 않는다', await 로그인.로그인버튼눌리나(), false);
    }, { capture: true });
  } finally {
    await 서버주소로켜기(driver, 기본서버주소);
  }
});
