import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { BrowserContext } from '@playwright/test';

import { 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 초기상태바꾸기 as 한국어초기상태바꾸기 } from './helpers/mock.helper.js';
import type { 풀기 } from './helpers/mock.helper.js';
import { 새창열기, 표식 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-136',
  name: '느린 모드를 켠 채 실시간 피드를 열어 둔 사이 새 공개 글이 오면 「1 개의 새 항목」 버튼이 보인다',
  precondition: ['두 번째 사용자의 「느린 모드」가 켜져 있다', '느린 모드 설정값은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    글머리: z.string().min(1).max(400).describe('게시할 글 앞부분 — 400자 이하 아무 글').default('느린 모드 확인 글'),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 피드 = new 실시간피드화면(page);
  const 표 = 표식('slow');
  const 풀기목록: 풀기[] = [];
  const 창묶음목록: BrowserContext[] = [];
  const 글지우기목록: Array<() => Promise<void>> = [];

  try {
    await test.step('두 번째 사용자로 로그인하고 느린 모드를 켠 실시간 피드를 연다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      풀기목록.push(await 한국어초기상태바꾸기(page, { use_pending_items: true }));
      await 피드.열기();
      await verify('두 번째 사용자의 실시간 피드에 「이 서버」 탭이 보인다', await 피드.이서버탭.isVisible(), true, { blocker: true });
    });

    await test.step('느린 모드를 켠 두 번째 사용자가 실시간 피드를 열어 둔 사이 일반 회원이 공개 글을 게시한다', async () => {
      const 일반 = await 새창열기(page);
      창묶음목록.push(일반.창묶음);
      await 로그인하기(일반.page, params.loginId, params.loginPassword);
      const 쓴글 = await 글쓰기API(일반.page, { status: `${params.글머리} ${표}`, visibility: 'public' });
      글지우기목록.push(() => 글지우기API(일반.page, 쓴글.id));
      const 보인다 = await 피드.새항목버튼.waitFor({ timeout: 15_000 }).then(() => true, () => false);
      await verify('느린 모드를 켠 채 실시간 피드를 열어 둔 사이 새 공개 글이 오면 「1 개의 새 항목」 버튼이 보인다', 보인다, true);
      await verify('새 글은 아직 목록에 없다', await 피드.글(표).count(), 0);
    });

    await test.step('「1 개의 새 항목」 버튼을 누른다', async () => {
      await 피드.새항목버튼.click();
      const 보인다 = await 피드.글(표).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('버튼을 누른 뒤에야 목록에 새 글이 보인다', 보인다, true);
    });
  } finally {
    for (const 지우기 of 글지우기목록) await 지우기();
    for (const 창묶음 of 창묶음목록) await 창묶음.close();
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
