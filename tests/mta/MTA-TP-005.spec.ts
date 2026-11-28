import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버 } from './helpers/app.helper.js';
import { 가입규칙화면으로 } from './helpers/flow-start.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 개인정보화면 } from './pages/privacy.page.js';
import { 규칙화면 } from './pages/rules.page.js';
import { 가입서버고르기 } from './pages/server-pick.page.js';
import { 시작화면 } from './pages/start.page.js';

const 규칙문구 = defineCase({
  tcId: 'MTA-UI-043',
  name: '서버 규칙 화면에 제목 「서버 규칙」 · 안내 「계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」 · 「동의합니다」 · 「동의 안 함」이 보인다',
  platforms: ['android'],
  precondition: ['가입 경로에서 우리 서버를 골라 서버 규칙 화면에 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('화면 제목').default('서버 규칙'),
    안내: z.string().describe('화면 안내').default('계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.'),
    동의: z.string().describe('동의 버튼 글').default('동의합니다'),
    비동의: z.string().describe('비동의 버튼 글').default('동의 안 함'),
  }),
});

const 규칙목록 = defineCase({
  tcId: 'MTA-UI-044',
  name: '서버 규칙 화면에 규칙 목록이 비어 보인다',
  platforms: ['android'],
  precondition: ['서버 규칙 화면에 있다'],
  params: z.object({}),
  expected: null,
});

const 동의안함 = defineCase({
  tcId: 'MTA-FN-048',
  name: '서버 규칙 화면에서 「동의 안 함」을 누르면 서버 고르기로 돌아간다',
  platforms: ['android'],
  precondition: ['서버 규칙 화면에 있다'],
  params: z.object({}),
  expected: null,
});

const 개인정보문구 = defineCase({
  tcId: 'MTA-UI-046',
  name: '개인정보 화면에 제목 「당신의 개인정보」 · 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」 · 「Mastodon for Android Privacy Policy」 링크와 부제 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['서버 규칙에 동의해 개인정보 화면에 있다'],
  params: z.object({}),
  expected: z.object({
    제목: z.string().describe('화면 제목').default('당신의 개인정보'),
    안내: z.string().describe('화면 안내').default('마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.'),
    링크: z.string().describe('앱 개인정보 링크 제목').default('Mastodon for Android Privacy Policy'),
    부제: z.string().describe('앱 개인정보 링크 부제').default('요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.'),
  }),
});

const 서버방침링크 = defineCase({
  tcId: 'MTA-UI-047',
  name: '개인정보 화면에 서버 개인정보처리방침 페이지(https://mastodon.maxihan.com/privacy-policy) 링크가 보인다',
  platforms: ['android'],
  precondition: ['개인정보 화면에 있다'],
  params: z.object({}),
  expected: z.object({ 앱링크: z.string().describe('앱 개인정보 링크 제목').default('Mastodon for Android Privacy Policy') }),
});

const 이용약관없음 = defineCase({
  tcId: 'MTA-UI-048',
  name: '개인정보 화면에 서버 이용 약관 링크가 보이지 않는다',
  platforms: ['android'],
  precondition: ['개인정보 화면에 있다'],
  params: z.object({}),
  expected: null,
});

const 비동의 = defineCase({
  tcId: 'MTA-FN-052',
  name: '개인정보 화면에서 「<서버>에 대해 비동의」를 누르면 규칙 화면까지 닫고 서버 고르기로 돌아간다',
  platforms: ['android'],
  precondition: ['개인정보 화면에 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-005',
  name: '서버 규칙과 개인정보 동의',
  platforms: ['android'],
  precondition: ['로그인한 계정이 없다'],
  cases: [규칙문구, 규칙목록, 동의안함, 개인정보문구, 서버방침링크, 이용약관없음, 비동의],
});

test(procedure, async ({ driver }) => {
  const 규칙 = new 규칙화면(driver);
  const 개인정보 = new 개인정보화면(driver);
  const 서버고르기 = new 가입서버고르기(driver);

  await test.case(규칙문구, async ({ expected }) => {
    await test.step('서버 규칙 화면 문구를 확인한다', async () => {
      await 시작화면열기(driver);
      await verify('시작 화면이 열려 있다', await new 시작화면(driver).떴나(), true, { blocker: true });
      await verify('가입 경로에서 우리 서버를 골라 서버 규칙 화면이 열려 있다', await 가입규칙화면으로(driver), true, { blocker: true });
      const 제목 = await verify('서버 규칙 화면에 제목 「서버 규칙」이 보인다', await 규칙.제목글(), expected.제목);
      const 안내 = await verify('서버 규칙 화면에 안내 「계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」가 보인다', await 규칙.안내글읽기(), expected.안내);
      const 동의 = await verify('서버 규칙 화면에 「동의합니다」가 보인다', await 규칙.동의버튼글(), expected.동의);
      const 비동의버튼 = await verify('서버 규칙 화면에 「동의 안 함」이 보인다', await 규칙.동의안함버튼글(), expected.비동의);
      await verify(
        '서버 규칙 화면에 제목 「서버 규칙」 · 안내 「계속 진행하는 것으로 mastodon.maxihan.com의 중재자들에 의해 정해지고 관리되는 규칙들에 동의하는 것으로 간주합니다.」 · 「동의합니다」 · 「동의 안 함」이 보인다',
        제목 && 안내 && 동의 && 비동의버튼,
        true,
      );
    });
  });

  await test.case(규칙목록, async () => {
    await test.step('서버 규칙 목록을 확인한다', async () => {
      await verify('서버 규칙 화면이 열려 있다', await 규칙.떴나(), true, { blocker: true });
      const 안내 = await 규칙.안내글읽기();
      await verify('서버 규칙 화면에 규칙 목록이 비어 보인다', (await 규칙.목록글읽기()).filter((글) => 글 !== 안내).length, 0);
    });
  });

  await test.case(동의안함, async () => {
    await test.step('서버 규칙 화면에서 「동의 안 함」을 누른다', async () => {
      await verify('서버 규칙 화면이 열려 있다', await 규칙.떴나(), true, { blocker: true });
      await 규칙.동의안함누르기();
      await verify('서버 규칙 화면에서 「동의 안 함」을 누르면 서버 고르기로 돌아간다', await 서버고르기.떴나(), true);
    });
  });

  await test.case(개인정보문구, async ({ expected }) => {
    await test.step('개인정보 화면 문구를 확인한다', async () => {
      await verify('가입 경로에서 우리 서버를 골라 서버 규칙 화면이 열려 있다', await 가입규칙화면으로(driver), true, { blocker: true });
      await 규칙.동의누르기();
      await verify('서버 규칙에 동의해 개인정보 화면이 열려 있다', await 개인정보.떴나(), true, { blocker: true });
      const 제목 = await verify('개인정보 화면에 제목 「당신의 개인정보」가 보인다', await 개인정보.제목글(), expected.제목);
      const 안내 = await verify('개인정보 화면에 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」가 보인다', (await 개인정보.안내글읽기()).includes(expected.안내), true);
      const 링크 = await verify('개인정보 화면에 「Mastodon for Android Privacy Policy」 링크가 보인다', (await 개인정보.링크제목읽기()).includes(expected.링크), true);
      const 부제 = await verify('개인정보 화면에 부제 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다', (await 개인정보.링크부제읽기()).includes(expected.부제), true);
      await verify(
        '개인정보 화면에 제목 「당신의 개인정보」 · 안내 「마스토돈 앱은 아무런 정보도 수집하지 않지만, 당신이 가입하는 서버는 다른 정책을 가질 수 있습니다.」 · 「Mastodon for Android Privacy Policy」 링크와 부제 「요약: 우리는 어떤 정보도 수집하거나 처리하지 않습니다.」가 보인다',
        제목 && 안내 && 링크 && 부제,
        true,
      );
    });
  });

  await test.case(서버방침링크, async ({ expected }) => {
    await test.step('서버 개인정보처리방침 링크를 확인한다', async () => {
      await verify('개인정보 화면이 열려 있다', await 개인정보.떴나(), true, { blocker: true });
      const 링크들 = await 개인정보.링크제목읽기();
      await verify('개인정보 화면에 서버 개인정보처리방침 페이지(https://mastodon.maxihan.com/privacy-policy) 링크가 보인다', 링크들.filter((제목) => 제목 !== expected.앱링크).length > 0, true);
    });
  });

  await test.case(이용약관없음, async () => {
    await test.step('서버 이용 약관 링크 자리를 확인한다', async () => {
      await verify('개인정보 화면이 열려 있다', await 개인정보.떴나(), true, { blocker: true });
      await verify('개인정보 화면에 서버 이용 약관 링크가 보이지 않는다', (await 개인정보.링크제목읽기()).some((제목) => 제목.includes('약관')), false);
    });
  });

  await test.case(비동의, async () => {
    await test.step('개인정보 화면에서 「mastodon.maxihan.com에 대해 비동의」를 누른다', async () => {
      await verify('개인정보 화면이 열려 있다', await 개인정보.떴나(), true, { blocker: true });
      await verify('개인정보 화면 비동의 버튼에 「mastodon.maxihan.com에 대해 비동의」가 보인다', await 개인정보.비동의버튼글(), `${서버}에 대해 비동의`);
      await 개인정보.비동의누르기();
      await verify('개인정보 화면에서 「<서버>에 대해 비동의」를 누르면 규칙 화면까지 닫고 서버 고르기로 돌아간다', await 서버고르기.떴나(), true);
    });
  });
});
