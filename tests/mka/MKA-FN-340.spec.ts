import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버주소로켜기, 앱꾸러미, 앱이닫혔나 } from './helpers/app.helper.js';
import { 앱데이터지우기 } from './helpers/screen-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

const 기본서버주소 = 'http://localhost:3002';

export const spec = defineCase({
  tcId: 'MKA-FN-340',
  name: 'server 값 없이 켠 앱이 서버에 닿지 않으면 토스트에 기본 주소 「http://localhost:3002」가 보인다',
  platforms: ['android'],
  precondition: ['앱 데이터가 지워져 있다'],
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
    await test.step('앱 데이터를 지운다', async () => {
      await 앱데이터지우기(driver);
      await verify('앱이 꺼져 있다', await 앱이닫혔나(driver), true, { blocker: true });
    });

    await test.step('server 값 없이 앱을 켜고 로그인한다', async () => {
      await driver.activateApp(앱꾸러미);
      await 로그인.제목나올때까지();
      await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
      await verify(
        'server 값 없이 켠 앱이 서버에 닿지 않으면 토스트에 기본 주소 「http://localhost:3002」가 보인다',
        await 알림.글(),
        `서버에 연결할 수 없습니다 (${기본서버주소})`,
      );
    });
  } finally {
    await 서버주소로켜기(driver, params.원래서버주소);
  }
});
