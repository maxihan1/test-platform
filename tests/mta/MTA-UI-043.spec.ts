import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버규칙화면까지 } from './helpers/signup-flow.helper.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-043',
  name: '「서버 규칙」 화면에 제목 「서버 규칙」 · 안내 「계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」 · 「동의합니다」 · 「동의 안 함」이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: z.object({
    안내: z.string().describe('서버 규칙 안내 문구').default('계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 규칙 = new 서버규칙화면(driver);

  await test.step('가입 경로에서 우리 서버를 고르고 「서버 규칙」 화면을 연다', async () => {
    await 서버규칙화면까지(driver);
    await verify('「서버 규칙」 화면 안내 글이 보인다', await 규칙.그려질때까지(), true, { blocker: true });
  });

  await test.step('「서버 규칙」 화면의 글을 확인한다', async () => {
    const 제목 = await verify('제목이 「서버 규칙」이다', await 규칙.글('제목'), '서버 규칙');
    const 안내 = await verify('안내 글이 기대 문구와 같다', await 규칙.글('안내'), expected.안내);
    const 동의 = await verify('「동의합니다」 버튼이 보인다', await 규칙.글('동의'), '동의합니다');
    const 거부 = await verify('「동의 안 함」 버튼이 보인다', await 규칙.글('동의안함'), '동의 안 함');
    await verify('「서버 규칙」 화면에 제목 「서버 규칙」 · 안내 「계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」 · 「동의합니다」 · 「동의 안 함」이 보인다', 제목 && 안내 && 동의 && 거부, true);
  });
});
