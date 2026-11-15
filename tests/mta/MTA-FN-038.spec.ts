import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-038',
  name: '가입 경로에서 Mastodon 이 아닌 example.com 을 고르고 「다음」을 누르면 「오류」 창에 「는 마스토돈 서버인 것 같지 않습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    서버주소: z.string().describe('서버 고르기에 적을 Mastodon 이 아닌 서버 주소').default('example.com'),
  }),
  expected: z.object({
    창제목: z.string().describe('오류 창 제목').default('오류'),
    창문구: z.string().describe('오류 창 안내 끝 문구').default('는 마스토돈 서버인 것 같지 않습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 고르기 = new 서버고르기화면(driver);
  const 창 = new 확인창(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입 경로에서 Mastodon 이 아닌 example.com 을 고르고 「다음」을 누른다', async () => {
    await 고르기.적기(params.서버주소);
    await 고르기.카드누르기(params.서버주소);
    await verify('「다음」이 켜진다', await 고르기.다음켜질때까지(), true, { blocker: true });
    await 고르기.다음누르기();
    await verify('오류 창이 뜬다', await 창.뜰때까지(20_000), true, { blocker: true });
    const 제목 = await verify('창 제목이 기대 제목과 같다', await driver.$(창.제목).getText(), expected.창제목);
    const 문구 = await verify('창 안내에 기대 문구가 들어 있다', (await driver.$(창.내용).getText()).includes(expected.창문구), true);
    await verify('가입 경로에서 Mastodon 이 아닌 example.com 을 고르고 「다음」을 누르면 「오류」 창에 「는 마스토돈 서버인 것 같지 않습니다.」가 보인다', 제목 && 문구, true);
  });
});
