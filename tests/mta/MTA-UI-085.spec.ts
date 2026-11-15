import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';

import { 가입해서이메일확인화면으로 } from './helpers/confirm.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-085',
  name: '「수신함 확인하기」 화면에 안내 「에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.」와 「?」가 보인다',
  platforms: ['android'],
  precondition: ['이메일 확인 대기 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 확인 = new 이메일확인화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 확인 대기 계정으로 로그인해 확인 화면을 연다', async () => {
    await 가입해서이메일확인화면으로(driver);
    await verify('「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true, { blocker: true });
    const 안내 = await verify('안내 「에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.」가 보인다', await 뜰때까지(driver, 확인.안내, 10_000), true);
    const 물음표 = await verify('「?」가 보인다', await 뜰때까지(driver, 확인.물음표, 10_000), true);
    await verify('「수신함 확인하기」 화면에 안내 「에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.」와 「?」가 보인다', 안내 && 물음표, true);
  });
});
