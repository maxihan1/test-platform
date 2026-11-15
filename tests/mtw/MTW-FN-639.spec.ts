import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내컬렉션번호들API, 새로생긴컬렉션지우기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션만들기화면 } from './pages/collection-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-639',
  name: '컬렉션 이름을 비우고 「컬렉션 만들기」를 누르면 컬렉션이 만들어지지 않는다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 컬렉션만들기화면(page);
  let 앞번호들: string[] = [];
  let 정리할수 = false;

  try {
    await test.step('일반 회원으로 로그인하고 새 컬렉션 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      앞번호들 = await 내컬렉션번호들API(page);
      정리할수 = true;
      await 화면.열기();
      await verify('새 컬렉션 화면에 「새 컬렉션」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    });

    await test.step('새 컬렉션 첫 단계에서 계정을 하나 넣고 「계속」을 누른다', async () => {
      await 화면.계정넣고계속('hana_photo');
      await verify('새 컬렉션 둘째 단계에 「기본 정보」가 보인다', await 화면.기본정보.isVisible(), true, { blocker: true });
    });

    await test.step('새 컬렉션 둘째 단계에서 이름을 비우고 「컬렉션 만들기」를 누른다', async () => {
      await 화면.이름비우고만들기누르기();
      const 만든수 = (await 내컬렉션번호들API(page)).filter((번호) => !앞번호들.includes(번호)).length;
      await verify('컬렉션 이름을 비우고 「컬렉션 만들기」를 누르면 컬렉션이 만들어지지 않는다', 만든수, 0);
    });
  } finally {
    if (정리할수) await 새로생긴컬렉션지우기API(page, 앞번호들);
  }
});
