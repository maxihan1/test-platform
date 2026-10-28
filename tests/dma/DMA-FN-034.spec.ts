import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버값없이켜기, 서버주소로켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 토스트글읽기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-034',
  name: 'server 값을 넘겨 켠 앱은 그 주소로 붙어 토스트에 그 주소가 보인다',
  platforms: ['android'],
  precondition: ['앱을 server 값으로 켰다'],
  params: z.object({
    serverAddress: z.string().describe('앱에 넘길 서버 주소 — 연결이 바로 거절되는 주소').default('http://127.0.0.1:9'),
    userId: z.string().describe('아이디 — 아무 글자').default('user2'),
    userPass: z.string().describe('비밀번호 — 아무 글자').default('wrong1234'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  try {
    await test.step('앱을 server 값으로 켠다', async () => {
      await 서버주소로켜기(driver, params.serverAddress);
      await 로그인.열릴때까지().catch(() => undefined);
      await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
    });

    await test.step('로그인 화면에서 「로그인」을 누른다', async () => {
      await 로그인.로그인(params.userId, params.userPass);
      const 글 = await 토스트글읽기(driver);
      await verify('server 값을 넘겨 켠 앱은 그 주소로 붙어 토스트에 그 주소가 보인다', 글.includes(params.serverAddress), true);
    }, { capture: true });
  } finally {
    await 서버값없이켜기(driver);
  }
});
