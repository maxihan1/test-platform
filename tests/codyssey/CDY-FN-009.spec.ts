import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인부품 } from './components/login.component.js';
import { 홈부품 } from './components/home.component.js';
import { 세계관화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-009',
  name: '홈에서 「Codyssey 세계관」 타일의 「보러가기」를 누르면 「코디세이 세계관」 화면 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['로그인한 홈이 열려 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 이메일').optional().meta({ secret: true }),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈부품(page);
  const 도착 = new 세계관화면(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await new 로그인부품(page).로그인하기(params.loginId ?? '', params.password ?? '');
  });

  await test.step('로그인 뒤 홈이 열린 것을 확인한다', async () => {
    const 보임 = await 홈.여정시작.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('로그인 뒤 홈에 「Journey Start!」가 보인다', 보임, true, { blocker: true });
  });

  await test.step('홈에서 「Codyssey 세계관」 타일의 「보러가기」를 누른다', async () => {
    await 홈.타일버튼('Codyssey 세계관').click();
    const 보임 = await 도착.제목.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    await verify('홈에서 「Codyssey 세계관」 타일의 「보러가기」를 누르면 「코디세이 세계관」 화면 제목이 보인다', 보임, true);
  });
});
