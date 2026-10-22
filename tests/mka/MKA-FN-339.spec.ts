import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버주소로켜기 } from './helpers/app.helper.js';
import { 닿지않는주소 } from './helpers/screen-tools.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-339',
  name: '서버에 닿지 않으면 토스트 「서버에 연결할 수 없습니다 ({서버 주소})」가 보인다',
  platforms: ['android'],
  precondition: ['앱이 닿지 않는 서버 주소로 켜졌다'],
  techniques: ['동등 분할'],
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
    await test.step('닿지 않는 서버 주소로 앱을 켠다', async () => {
      await 서버주소로켜기(driver, 닿지않는주소);
      await 로그인.제목나올때까지();
      await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
    });

    await test.step('닿지 않는 서버 주소로 켠 앱에서 로그인한다', async () => {
      await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
      await verify(
        '서버에 닿지 않으면 토스트 「서버에 연결할 수 없습니다 ({서버 주소})」가 보인다',
        await 알림.글(),
        `서버에 연결할 수 없습니다 (${닿지않는주소})`,
      );
    });
  } finally {
    await 서버주소로켜기(driver, params.원래서버주소);
  }
});
