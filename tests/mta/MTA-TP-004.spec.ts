import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인서버고르기로가기 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 로그인서버고르기 } from './pages/server-pick.page.js';
import { 시작화면 } from './pages/start.page.js';

const 제목과안내 = defineCase({
  tcId: 'MTA-UI-021',
  name: '로그인 경로 서버 고르기 화면에 제목 「돌아오신 것을 환영합니다」와 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('화면 제목').default('돌아오신 것을 환영합니다'),
    안내: z.string().describe('화면 안내').default('계정을 생성한 서버에 로그인하세요.'),
  }),
});

const 입력칸힌트 = defineCase({
  tcId: 'MTA-UI-023',
  name: '로그인 경로 서버 고르기 입력 칸에 힌트 「서버 URL」이 보인다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 힌트: z.string().describe('입력 칸 힌트').default('서버 URL') }),
});

const 필터칩없음 = defineCase({
  tcId: 'MTA-UI-025',
  name: '로그인 경로 서버 고르기에 필터 칩이 보이지 않는다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 카탈로그서버 = defineCase({
  tcId: 'MTA-FN-030',
  name: '로그인 경로에서 「mastodon.soc」를 적으면 맞는 카탈로그 서버 「mastodon.social」이 보인다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기 화면이 열려 있다'],
  params: z.object({ 서버입력: z.string().min(1).describe('입력 칸에 적을 글 — 카탈로그 서버 이름의 앞부분').default('mastodon.soc') }),
  expected: z.object({ 서버카드: z.string().describe('보여야 하는 카탈로그 서버').default('mastodon.social') }),
});

const 기본서버목록 = defineCase({
  tcId: 'MTA-UI-512',
  name: '로그인 경로 서버 목록에 입력이 비어 있으면 mastodon.social · mastodon.online · staging.mastodon.social이 보인다',
  platforms: ['android'],
  precondition: ['로그인용 서버 고르기 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-004',
  name: '로그인 서버 고르기',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [제목과안내, 입력칸힌트, 필터칩없음, 카탈로그서버, 기본서버목록],
});

test(procedure, async ({ driver }) => {
  const 고르기 = new 로그인서버고르기(driver);

  await test.case(제목과안내, async ({ expected }) => {
    await test.step('로그인용 서버 고르기 제목과 안내를 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      const 제목 = await verify('로그인 경로 서버 고르기 화면에 제목 「돌아오신 것을 환영합니다」가 보인다', await 고르기.제목글(), expected.제목);
      const 안내 = await verify('로그인 경로 서버 고르기 화면에 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다', await 고르기.안내글(), expected.안내);
      await verify('로그인 경로 서버 고르기 화면에 제목 「돌아오신 것을 환영합니다」와 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다', 제목 && 안내, true);
    });
  });

  await test.case(입력칸힌트, async ({ expected }) => {
    await test.step('로그인용 서버 고르기 입력 칸을 확인한다', async () => {
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      await verify('로그인 경로 서버 고르기 입력 칸에 힌트 「서버 URL」이 보인다', await 고르기.입력칸글(), expected.힌트);
    });
  });

  await test.case(필터칩없음, async () => {
    await test.step('로그인용 서버 고르기에서 필터 칩 자리를 확인한다', async () => {
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      await verify('로그인 경로 서버 고르기에 필터 칩이 보이지 않는다', await 고르기.필터칩있나(), false);
    });
  });

  await test.case(카탈로그서버, async ({ params, expected }) => {
    await test.step('입력 칸에 「mastodon.soc」를 적는다', async () => {
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기(params.서버입력);
      await verify('로그인 경로에서 「mastodon.soc」를 적으면 맞는 카탈로그 서버 「mastodon.social」이 보인다', await 고르기.카드있나(expected.서버카드), true);
    });
  });

  await test.case(기본서버목록, async () => {
    await test.step('입력이 빈 서버 목록을 확인한다', async () => {
      await verify('로그인용 서버 고르기 화면이 열려 있다', await 로그인서버고르기로가기(driver), true, { blocker: true });
      await 고르기.적기('');
      const 소셜 = await verify('서버 목록에 mastodon.social이 보인다', await 고르기.카드있나('mastodon.social'), true);
      const 온라인 = await verify('서버 목록에 mastodon.online이 보인다', await 고르기.카드있나('mastodon.online'), true);
      const 스테이징 = await verify('서버 목록에 staging.mastodon.social이 보인다', await 고르기.카드있나('staging.mastodon.social'), true);
      await verify('로그인 경로 서버 목록에 입력이 비어 있으면 mastodon.social · mastodon.online · staging.mastodon.social이 보인다', 소셜 && 온라인 && 스테이징, true);
    });
  });
});
