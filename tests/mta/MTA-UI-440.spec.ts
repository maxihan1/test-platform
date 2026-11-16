import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-440',
  name: '「Mastodon에 대해」에 「추가 설정」 · 「마스토돈에 기여」 · 「이용 약관」 · 「개인정보 정책」 · 「미디어 캐시 지우기」와 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    줄1: z.string().describe('Mastodon에 대해 줄 이름').default('추가 설정'),
    줄2: z.string().describe('Mastodon에 대해 줄 이름').default('마스토돈에 기여'),
    줄3: z.string().describe('Mastodon에 대해 줄 이름').default('이용 약관'),
    줄4: z.string().describe('Mastodon에 대해 줄 이름').default('개인정보 정책'),
    줄5: z.string().describe('Mastodon에 대해 줄 이름').default('미디어 캐시 지우기'),
    줄6: z.string().describe('Mastodon에 대해 줄 이름').default('안드로이드용 마스토돈 v2.13.5 (194)'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 「Mastodon에 대해」를 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「Mastodon에 대해」가 열린다', await 설정줄열기(driver, 'Mastodon에 대해'), true, { blocker: true });
    const 보임1 = await verify('「Mastodon에 대해」에 「추가 설정」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.줄1), 10_000), true);
    const 보임2 = await verify('「Mastodon에 대해」에 「마스토돈에 기여」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.줄2), 10_000), true);
    const 보임3 = await verify('「Mastodon에 대해」에 「이용 약관」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.줄3), 10_000), true);
    const 보임4 = await verify('「Mastodon에 대해」에 「개인정보 정책」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.줄4), 10_000), true);
    const 보임5 = await verify('「Mastodon에 대해」에 「미디어 캐시 지우기」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.줄5), 10_000), true);
    const 보임6 = await verify('「Mastodon에 대해」에 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.줄6), 10_000), true);
    await verify('「Mastodon에 대해」에 「추가 설정」 · 「마스토돈에 기여」 · 「이용 약관」 · 「개인정보 정책」 · 「미디어 캐시 지우기」와 「안드로이드용 마스토돈 v2.13.5 (194)」가 보인다', 보임1 && 보임2 && 보임3 && 보임4 && 보임5 && 보임6, true);
  });
});
