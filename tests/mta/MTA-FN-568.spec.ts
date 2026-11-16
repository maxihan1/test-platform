import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 로그인서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-568',
  name: '로그인 경로에서 없는 도메인 서버를 고르고 「다음」을 누르면 「오류」 창에 「zzqq-none.invalid는 마스토돈 서버인 것 같지 않습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    서버주소: z.string().describe('로그인 서버 고르기에 적을 닿지 않는 서버 주소 — .invalid 로 끝나는 주소').default('zzqq-none.invalid'),
  }),
  expected: z.object({
    창문구: z.string().describe('없는 도메인을 골랐을 때 「오류」 창 문구').default('zzqq-none.invalid는 마스토돈 서버인 것 같지 않습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 고르기 = new 서버고르기화면(driver);
  const 창 = new 확인창(driver);

  await test.step('앱을 켜서 로그인용 서버 고르기 화면을 연다', async () => {
    await 로그인서버고르기까지(driver);
    await verify('로그인용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('로그인 경로에 없는 도메인 zzqq-none.invalid 를 고르고 「다음」을 누른다', async () => {
    await 고르기.적기(params.서버주소);
    await 고르기.카드누르기(params.서버주소);
    await verify('「다음」이 켜진다', await 고르기.다음켜질때까지(), true, { blocker: true });
    await 고르기.다음누르기();
    await verify('로그인 경로에서 없는 도메인 서버를 고르고 「다음」을 누르면 「오류」 창에 「zzqq-none.invalid는 마스토돈 서버인 것 같지 않습니다.」가 보인다', await 뜰때까지(driver, 창.안의글자(expected.창문구), 30_000), true);
  });
});
