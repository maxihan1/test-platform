import { defineCase, test, verify } from '@platform/kit';

import { 점검설정바꾸기, 점검설정읽기, 점검되돌리기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-262',
  name: '허용 계정 번호를 배열로 넣어 변경하면 읽을 때 allowedAccountIds 가 쉼표로 이은 문자열 「1,2」다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 원래점검 = await 점검설정읽기(admin);
  try {
    await test.step('허용 계정 번호 배열 [1, 2] 로 점검 설정을 변경한 뒤 GET /opsapi/maintenance 를 부른다', async () => {
      const 변경 = await 점검설정바꾸기(admin, { enabled: false, message: '[QA] ARI-FN-262 점검 시험', startsAt: null, endsAt: null, allowedAccountIds: [1, 2] });
      await verify('점검 설정이 변경됐다', 변경.status(), 200, { blocker: true });
      const 읽은값 = await 점검설정읽기(admin);
      await verify('허용 계정 번호를 배열로 넣어 변경하면 읽을 때 allowedAccountIds 가 쉼표로 이은 문자열 「1,2」다', 읽은값.allowedAccountIds, '1,2');
    });
  } finally {
    await 점검되돌리기(admin, 원래점검);
  }
});
