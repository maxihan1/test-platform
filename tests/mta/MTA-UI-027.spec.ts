import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-027',
  name: '로그인용 서버 고르기 화면에 입력이 비어 있으면 서버 목록에 mastodon.social · mastodon.online · staging.mastodon.social이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: z.object({
    서버목록: z.string().describe('서버 목록 카드 이름 차례').default('mastodon.social, mastodon.online, staging.mastodon.social'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('로그인용 서버 고르기 화면을 입력 없이 연다', async () => {
    await 로그인서버고르기까지(driver);
    await verify('로그인용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
    await verify('서버 목록 카드가 뜬다', await 뜰때까지(driver, 고르기.카드('mastodon.online'), 20_000), true, { blocker: true });
    const 카드들 = await 고르기.카드제목읽기();
    await verify('로그인용 서버 고르기 화면에 입력이 비어 있으면 서버 목록에 mastodon.social · mastodon.online · staging.mastodon.social이 보인다', 카드들.join(', '), expected.서버목록);
  });
});
