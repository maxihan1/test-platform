import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시드글번호 } from './components/board-helpers.component.js';
import { 기준주소, 안내창끄기 } from './components/session.component.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-175',
  name: '「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다',
  held: '보류 — locator.waitFor: Test timeout of 30000ms exceeded (대상 서버가 http 라 브라우저에 navigator.clipboard 가 없어 복사 토스트가 뜨지 않는다)',
  precondition: ['비회원이다', '브라우저 클립보드 권한을 줬다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  let 글번호 = 0;

  await test.step('브라우저 클립보드 권한을 주고 게시글 상세를 연다', async () => {
    await 안내창끄기(page);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    글번호 = await 시드글번호(page.request);
    await 상세.열기(글번호);
  });

  await test.step('게시글 상세에서 「링크 복사」를 누른다', async () => {
    await 상세.링크복사버튼.click();
    const 토스트 = await 상세.토스트.기다리기('링크를 복사했습니다');
    await verify('「링크 복사」를 누르면 토스트 「링크를 복사했습니다」가 보인다', await 토스트.isVisible(), true);
    await verify('클립보드에 그 글의 주소가 들어 있다', await 상세.클립보드읽기(), `${기준주소(page)}/board/${글번호}`);
  });
});
