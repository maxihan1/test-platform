// 앱 배운 것 찾기 — 작성 AI 가 배운 것 글(자료 폴더 app-learned.txt)을 통째로 읽지 않고 목차 · 종류 · 화면 키 · 열쇠 · 낱말로 찾는다 (도메인/작성 §3.6 「★ 앱 배우기」 「배운 것 — 종류와 칸」 읽기)
// 이번 세션이 적었지만 아직 안 올린 줄(app-learned.json)도 얹어 찾는다. `--check` 는 일찍 끝내기 검사다 — 에이전트가 세션을 더 띄울지 같은 셈으로 본다
// 쓰는 법: npx tsx scripts/authoring-app-find.ts <자료 폴더> [<종류> | --screen <화면 키> | --check | <열쇠나 낱말>…] — 폰 없이 파일만 읽는다. 아무것도 안 주면 목차다. --check 는 0 끝내도 됨 · 1 아직
import { pathToFileURL } from 'node:url';

import { 배운종류 } from '../apps/admin/src/prd/appLearned.js';
import { 믿음 } from '../apps/admin/src/prd/gameKinds.js';
import { type 앱배운줄, 끝내도되나, 쪽지열쇠, 정리알림, 지금배운것 } from './authoring-app-learned.js';

const 찾은상한 = 40;
const 줄상한 = 240;

const 한줄 = (x: 앱배운줄): string => `${x.key} · ${x.name}${x.screen === null ? '' : ` · 화면 ${x.screen}`} · 배움 ${JSON.stringify(x.learned)}`;
const 요약 = (x: 앱배운줄): string => {
  const 머리 = `${x.key} · ${x.name}${x.screen === null ? '' : ` · ${x.screen}`} · ${믿음[x.learned.belief ?? 'GUESS']}${x.learned.seen === undefined ? '' : ` · ${String(x.learned.seen)}번 봄`}`;
  return 머리.length > 줄상한 ? `${머리.slice(0, 줄상한)}…` : 머리;
};
const 더 = (n: number): string[] => (n > 찾은상한 ? [`… 외 ${String(n - 찾은상한)}줄 — 낱말을 좁혀 다시 찾는다`] : []);

export function 찾기(자료: string, 인자: readonly string[]): { 글: string; 코드: number } {
  const 줄들 = 지금배운것(자료);
  const 끝 = 끝내도되나(자료);
  const 셈줄 = `배운 줄 없는 화면 ${String(끝.남은화면.length)}${끝.남은화면.length === 0 ? '' : ` — ${끝.남은화면.slice(0, 10).join(' · ')}${끝.남은화면.length > 10 ? ' …' : ''}`} / 열린 물음 ${String(끝.열린.length)}${끝.열린.length === 0 ? '' : ` — ${끝.열린.slice(0, 10).join(' · ')}${끝.열린.length > 10 ? ' …' : ''}`}`;
  const 낸다 = (몸: string[], 코드 = 0) => ({ 글: [...몸, ...정리알림(자료)].join('\n'), 코드 });
  if (인자[0] === '--check') {
    const 됨 = 끝.남은화면.length === 0 && 끝.열린.length === 0;
    return 낸다([`[앱 배우기] ${됨 ? '끝내도 된다' : '아직 끝내지 않는다'} — ${셈줄}`], 됨 ? 0 : 1);
  }
  if (인자.length === 0) {
    const 쪽지 = 줄들.find((x) => x.key === 쪽지열쇠);
    return 낸다([
      `# 앱 배운 것 — 줄 ${String(줄들.length)}개. 기대값의 근거가 아니다`,
      ...Object.entries(배운종류).map(([k, 이름]) => `- ${k} ${이름}: ${String(줄들.filter((x) => x.kind === k).length)}`),
      셈줄,
      ...(쪽지 === undefined ? [] : ['', `쪽지: ${쪽지.learned.text}`]),
      '',
      '종류 이름(RULE) · --screen <화면 키> · 열쇠나 낱말로 찾는다.',
    ]);
  }
  if (인자[0] === '--screen') {
    const 들 = 줄들.filter((x) => x.screen === 인자[1]);
    return 낸다([`# 화면 ${인자[1] ?? ''} — 줄 ${String(들.length)}`, ...들.slice(0, 찾은상한).map(한줄), ...더(들.length)]);
  }
  if (인자.length === 1 && Object.hasOwn(배운종류, 인자[0]!)) {
    const 들 = 줄들.filter((x) => x.kind === 인자[0]);
    return 낸다([`# ${배운종류[인자[0] as keyof typeof 배운종류]} (${인자[0]!}) — 줄 ${String(들.length)}`, ...들.slice(0, 찾은상한).map(요약), ...더(들.length)]);
  }
  const 낱말 = 인자.map((w) => w.toLowerCase());
  const 들 = 줄들.filter((x) => 인자.includes(x.key) || 낱말.every((w) => 한줄(x).toLowerCase().includes(w)));
  return 낸다([`# 찾은 줄 ${String(들.length)}`, ...들.slice(0, 찾은상한).map(한줄), ...더(들.length)]);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [자료, ...인자] = process.argv.slice(2);
  if (자료 === undefined) {
    console.error('쓰는 법: npx tsx scripts/authoring-app-find.ts <자료 폴더> [<종류> | --screen <화면 키> | --check | <열쇠나 낱말>…]');
    process.exitCode = 2;
  } else {
    const r = 찾기(자료, 인자);
    console.log(r.글);
    process.exitCode = r.코드;
  }
}
