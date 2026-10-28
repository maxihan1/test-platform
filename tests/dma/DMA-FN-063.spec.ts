import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 기본서버주소, 서버주소로켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-063',
  name: '빈 칸으로 「로그인」을 누르면 서버에 보내지 않아 「서버에 연결할 수 없습니다」 토스트가 보이지 않는다',
  platforms: ['android'],
  precondition: ['앱을 닿지 않는 서버 주소로 켰다'],
  params: z.object({
    serverAddress: z.string().describe('서버 주소 — 연결이 바로 거절되는 주소').default('http://127.0.0.1:9'),
    userId: z.string().describe('아이디 — 아무 글자').default('user2'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);
  const 알림 = new 토스트(driver);

  try {
    await test.step('앱을 닿지 않는 서버 주소로 켠다', async () => {
      await 서버주소로켜기(driver, params.serverAddress);
      await 로그인.열릴때까지().catch(() => undefined);
      await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
    });

    await test.step('비밀번호를 비우고 「로그인」을 누른다', async () => {
      await 로그인.로그인(params.userId, '');
      await 로그인.오류글뜰때까지().catch(() => undefined);
      await verify('빈 칸으로 「로그인」을 누르면 서버에 보내지 않아 「서버에 연결할 수 없습니다」 토스트가 보이지 않는다', await 알림.보이나(), false);
    }, { capture: true });
  } finally {
    await 서버주소로켜기(driver, 기본서버주소);
  }
});
