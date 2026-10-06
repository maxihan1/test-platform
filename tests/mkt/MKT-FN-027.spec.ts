import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 없는주소화면 } from './pages/not-found.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-027',
  name: '없는 주소로 들어가면 「페이지를 찾을 수 없습니다」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    주소: z.string().describe('없는 주소').default('/no-such-page'),
  }),
  expected: z.object({}),
  techniques: ['동등 분할'],
});

test(spec, async ({ page, params }) => {
  const 없는주소 = new 없는주소화면(page);

  await test.step('없는 주소 「/no-such-page」를 연다', async () => {
    await 안내창끄기(page);
    await 없는주소.주소열기(params.주소);
    await verify('비회원이다', await 없는주소.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('없는 주소로 들어가면 「페이지를 찾을 수 없습니다」가 보인다', (await 없는주소.첫제목.first().innerText()).trim(), '페이지를 찾을 수 없습니다');
    await verify('「홈으로」 버튼이 보인다', await 없는주소.홈으로.isVisible(), true);
  });
});
