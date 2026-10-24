import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 설정읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, type 강화응답, 새골드캐릭터, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-182',
  name: '+9 롱 소드를 성공으로 강화하면 +10 이 된다',
  platforms: ['android'],
  precondition: [
    '새 전사 캐릭터가 +9 롱 소드와 무기 강화 주문서를 가지고 있고 강화 결과가 성공으로 고정돼 있다',
    '새 전사 캐릭터가 +10 롱 소드와 무기 강화 주문서를 가지고 있다',
  ],
  techniques: ['경계값 분석'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_10', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 아홉: 캐릭터 | undefined;
  let 열: 캐릭터 | undefined;
  try {
    await test.step('+9 롱 소드를 가진 캐릭터와 +10 롱 소드를 가진 캐릭터를 만든다', async () => {
      아홉 = await 새골드캐릭터(admin, 'qafn182', 5000);
      열 = await 새골드캐릭터(admin, 'qafn182', 5000);
      await 아이템주기(admin, 아홉, 'sword_long', { 강화: 9 });
      await 아이템주기(admin, 아홉, 'scroll_weapon');
      await 아이템주기(admin, 열, 'sword_long', { 강화: 10 });
      await 아이템주기(admin, 열, 'scroll_weapon');
    });
    await test.step('강화 결과를 성공으로 고정한다', async () => {
      await 결과고정비우기(admin);
      await 결과고정(admin, { enhance: ['Success'] });
    });
    await test.step('두 캐릭터의 롱 소드와 성공 고정을 확인한다', async () => {
      await verify('첫째 캐릭터의 롱 소드가 +9 이다', 찾기(await 가방받기(request, 아홉!), 'sword_long')?.enhanceLevel, 9, { blocker: true });
      await verify('둘째 캐릭터의 롱 소드가 +10 이다', 찾기(await 가방받기(request, 열!), 'sword_long')?.enhanceLevel, 10, { blocker: true });
      await verify('강화 결과가 성공으로 고정돼 있다', (await 설정읽기(admin)).forced.enhance, ['Success'], { blocker: true });
    });
    await test.step('+9 롱 소드를 강화한다', async () => {
      const 가방값 = await 가방받기(request, 아홉!);
      const 응답 = await 본문<강화응답>(await 강화요청(request, 아홉!, 찾기(가방값, 'sword_long')!.id, 찾기(가방값, 'scroll_weapon')!.id), '+9 롱 소드 강화');
      await verify('+9 롱 소드를 성공으로 강화하면 +10 이 된다', 응답.toLevel, 10);
    });
    await test.step('+10 롱 소드를 강화한다', async () => {
      const 가방값 = await 가방받기(request, 열!);
      const 응답 = await 강화요청(request, 열!, 찾기(가방값, 'sword_long')!.id, 찾기(가방값, 'scroll_weapon')!.id);
      const 상태 = await verify('강화 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('강화 오류 코드가 「MAX_ENHANCE」이다', await 오류코드(응답), 'MAX_ENHANCE');
      await verify('+10 롱 소드를 강화하면 409 「MAX_ENHANCE」다', 상태 && 코드, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (아홉 !== undefined) await 캐릭터지우기(admin, 아홉);
    if (열 !== undefined) await 캐릭터지우기(admin, 열);
  }
});
