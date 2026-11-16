import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 확인창 } from './components/dialog.component.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-580',
  name: '「초대 링크 입력하기」에 없는 초대 링크를 넣으면 「유효하지 않은 초대 링크」 창과 「이 초대 링크는 유효하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    초대링크: z.string().describe('입력 창에 적을 초대 링크 — 우리 서버에 없는 초대 코드').default('https://mastodon.maxihan.com/invite/zzqq-none'),
  }),
  expected: z.object({
    창제목: z.string().describe('안내 창 제목').default('유효하지 않은 초대 링크'),
    안내글: z.string().describe('입력 창 오류 문구').default('이 초대 링크는 유효하지 않습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 고르기 = new 서버고르기화면(driver);
  const 창 = new 확인창(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입용 서버 고르기에서 「초대 링크 사용하기」를 누른다', async () => {
    await 고르기.초대링크사용누르기();
    await verify('「초대 링크 입력하기」 입력 창이 뜬다', await 고르기.글보이나('초대 링크 입력하기'), true, { blocker: true });
  });

  await test.step('「초대 링크 입력하기」에 없는 초대 링크를 넣는다', async () => {
    await 고르기.초대링크적기(params.초대링크);
    await verify('입력 창의 확인 단추가 보인다', await 창.뜰때까지(), true, { blocker: true });
    await 창.확인();
    const 제목 = await verify('「유효하지 않은 초대 링크」 창이 보인다', await 고르기.글보이나(expected.창제목, 20_000), true);
    const 안내 = await verify('「이 초대 링크는 유효하지 않습니다.」가 보인다', await 고르기.글보이나(expected.안내글, 10_000), true);
    await verify('「초대 링크 입력하기」에 없는 초대 링크를 넣으면 「유효하지 않은 초대 링크」 창과 「이 초대 링크는 유효하지 않습니다.」가 보인다', 제목 && 안내, true);
  });
});
