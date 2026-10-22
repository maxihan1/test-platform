import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버주소로켜기 } from './helpers/app.helper.js';
import { 닿지않는주소 } from './helpers/screen-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-341',
  name: 'server 값으로 켜면 토스트의 서버 주소가 넘긴 주소 「http://127.0.0.1:9」다',
  platforms: ['android'],
  precondition: ['앱을 server 값 「http://127.0.0.1:9」로 켰다'],
  held: '보류 — 앱이 원래 쓰는 서버 주소를 모른다(케이스 끝에 되돌려야 한다)',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    원래서버주소: z.string().describe('앱이 원래 쓰는 서버 주소 — 케이스 끝에 이 주소로 되돌린다'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);
  const 알림 = new 토스트(driver);

  try {
    await test.step('앱을 server 값 「http://127.0.0.1:9」로 켠다', async () => {
      await 서버주소로켜기(driver, 닿지않는주소);
      await 로그인.제목나올때까지();
      await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
    });

    await test.step('server 값을 넘겨 켠 앱에서 로그인한다', async () => {
      await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
      await verify(
        'server 값으로 켜면 토스트의 서버 주소가 넘긴 주소 「http://127.0.0.1:9」다',
        await 알림.글(),
        `서버에 연결할 수 없습니다 (${닿지않는주소})`,
      );
    });
  } finally {
    await 서버주소로켜기(driver, params.원래서버주소);
  }
});
