import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 프로필색인차단됨 } from './helpers/text-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 개인정보와도달화면 } from './pages/privacy-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-712',
  name: '개인정보와 도달을 바꿔 저장하면 프로필 페이지에 곧바로 반영된다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 설정 = new 개인정보와도달화면(page);
  let 사용자명 = '';
  let 원래켜짐 = true;

  await test.step('두 번째 사용자로 로그인해 개인정보와 도달을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    사용자명 = (await 내계정API(page)).username;
    await 설정.열기();
    await verify('개인정보와 도달 화면에 「변경 사항을 저장」이 보인다', await 설정.틀.저장.isVisible(), true, { blocker: true });
    원래켜짐 = await 설정.검색엔진.isChecked();
  });

  try {
    await test.step('두 번째 사용자가 「검색엔진에 프로필 페이지 포함하기」를 끄고 저장한다', async () => {
      await 설정.켜고끄기(설정.검색엔진, false);
      await 설정.저장하기();
      await 설정.틀.성공안내.waitFor();
      await verify('개인정보와 도달을 바꿔 저장하면 프로필 페이지에 곧바로 반영된다', await 프로필색인차단됨(page, 사용자명), true);
    });
  } finally {
    await 설정.열기();
    await 설정.켜고끄기(설정.검색엔진, 원래켜짐);
    await 설정.저장하기();
    await 설정.틀.성공안내.waitFor();
  }
});
