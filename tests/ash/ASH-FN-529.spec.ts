import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 목록칸들 } from './helpers/admin.helper.js';
import { 본문 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-529',
  name: '아이템 템플릿 목록에 아이템 표의 20개가 id · name · type 으로 온다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키가 있다', (await admin.get('/admin/config')).ok(), true, { blocker: true });
  });
  await test.step('아이템 템플릿 목록을 받는다', async () => {
    const 목록 = await 본문<object[]>(await admin.get('/admin/item-templates'), '아이템 템플릿 목록');
    const 개수 = await verify('아이템 템플릿이 20개다', 목록.length, 20);
    const 칸 = await verify('아이템 템플릿마다 id · name · type 이 온다', 목록칸들(목록), 목록글('id', 'name', 'type'));
    await verify('아이템 템플릿 목록에 아이템 표의 20개가 id · name · type 으로 온다', 개수 && 칸, true);
  });
});
