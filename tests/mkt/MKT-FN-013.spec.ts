import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원로그인, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 글만들기, 글지우기, 댓글달기 } from './components/data.component.js';
import { 알림종누르고읽음처리끝나길기다리기, 있어야한다 } from './components/site-extra.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-013',
  name: '내 글에 새 댓글이 달린 뒤 화면을 열면 알림 종 옆에 읽지 않은 알림 수 「1」이 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page, request }) => {
  const 쇼핑 = new 쇼핑화면(page);
  let 회원 = undefined as 임시회원 | undefined;
  let 둘째 = undefined as 임시회원 | undefined;
  let 글번호 = undefined as number | undefined;

  try {
    await test.step('새로 만든 회원을 가입시키고 로그인한다', async () => {
      회원 = await 임시회원로그인(page.request);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await verify('새로 만든 회원으로 로그인해 있다', (await page.request.get('/api/auth/me')).status(), 200, { blocker: true });
    });

    await test.step('내 글을 쓰고 다른 회원이 댓글을 단다', async () => {
      글번호 = (await 글만들기(page.request, { title: '알림 확인용 글', content: '알림이 오는지 보려고 쓴 글입니다' })).id;
      둘째 = await 임시회원로그인(request);
      await 댓글달기(request, 글번호, '첫째 댓글입니다');
    });

    await test.step('내 글에 다른 회원이 댓글을 단 뒤 쇼핑 화면을 연다', async () => {
      await 안내창끄기(page);
      await 쇼핑.열기();
      await 쇼핑.머리글.알림수.waitFor();
      await verify('내 글에 새 댓글이 달린 뒤 화면을 열면 알림 종 옆에 읽지 않은 알림 수 「1」이 보인다', await 쇼핑.머리글.알림수.innerText(), '1');
    });

    await test.step('알림 종을 누른다', async () => {
      await 알림종누르고읽음처리끝나길기다리기(page, 쇼핑.머리글.알림종);
      await verify('알림 목록이 펼쳐진다', await 쇼핑.머리글.알림목록.isVisible(), true);
      await verify('알림 종 옆 숫자가 사라진다', await 쇼핑.머리글.알림수.isVisible(), false);
    });

    await test.step('쇼핑 화면에서 다른 회원이 내 글에 댓글을 하나 더 달고 10초를 기다린다', async () => {
      await 댓글달기(request, 있어야한다(글번호, '내 글'), '둘째 댓글입니다');
      await page.waitForTimeout(10500);
      await verify('화면을 새로 고치지 않아도 10초 안에 알림 종 옆에 「1」이 다시 보인다', await 쇼핑.머리글.알림수.innerText(), '1');
    });
  } finally {
    if (글번호 !== undefined) await 글지우기(page.request, 글번호);
    if (둘째) await 임시회원지우기(request, 둘째);
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});
