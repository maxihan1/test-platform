import { defineCase, test, verify } from '@platform/kit';

import { 시각 } from './helpers/api.helper.js';
import { 시각같음, 점검켜고서버상태읽기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-152',
  name: '문구와 기간을 넣어 점검을 켜면 maintenance.message · startsAt · endsAt 이 넣은 값과 같다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  await test.step('문구와 기간을 넣어 점검을 켠 뒤 GET /api/serverstatus 를 부른다', async () => {
    const 문구 = '[QA] ARI-FN-152 점검 시험';
    const 시작 = 시각(60);
    const 끝 = 시각(120);
    const { 켜기코드, 상태 } = await 점검켜고서버상태읽기(request, admin, { enabled: true, message: 문구, startsAt: 시작, endsAt: 끝, allowedAccountIds: [] });
    await verify('점검이 켜졌다', 켜기코드, 200, { blocker: true });
    const 문구같음 = await verify('maintenance.message 가 넣은 문구와 같다', 상태?.maintenance.message, 문구);
    const 시작같음 = await verify('maintenance.startsAt 이 넣은 시작과 같다', 시각같음(상태?.maintenance.startsAt, 시작), true);
    const 끝같음 = await verify('maintenance.endsAt 이 넣은 끝과 같다', 시각같음(상태?.maintenance.endsAt, 끝), true);
    await verify('문구와 기간을 넣어 점검을 켜면 maintenance.message · startsAt · endsAt 이 넣은 값과 같다', 문구같음 && 시작같음 && 끝같음, true);
  });
  await test.step('기간 없이 점검을 켠 뒤 GET /api/serverstatus 를 부른다', async () => {
    const { 켜기코드, 상태 } = await 점검켜고서버상태읽기(request, admin, {
      enabled: true,
      message: '[QA] ARI-FN-152 점검 시험',
      startsAt: null,
      endsAt: null,
      allowedAccountIds: [],
    });
    await verify('점검이 켜졌다', 켜기코드, 200, { blocker: true });
    const 시작비어 = await verify('maintenance.startsAt 이 null 이다', 상태?.maintenance.startsAt === null, true);
    const 끝비어 = await verify('maintenance.endsAt 이 null 이다', 상태?.maintenance.endsAt === null, true);
    await verify('기간 없이 켰을 때 maintenance.startsAt 과 endsAt 은 null 이다', 시작비어 && 끝비어, true);
  });
});
