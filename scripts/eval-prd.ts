// PRD 채점 명령 — 정답지 기준 포착률 · 확인 필요 비율을 찍고, 서비스 사이 칸 겹침에 쓸 번호표를 쓴다 (⑧ 일괄 시험 eval)
// 실행: npx tsx scripts/eval-prd.ts <정답지 기획서.md> <prd.json> [--대응표 <대응표.md>] [--표 <요구사항 표>] [--번호표 <쓸 파일.json>]
// prd.json 은 그 서비스의 지금 판 items 다 — 로그인 없이 DB 에서 뽑는다(접두사만 바꾼다).
//   psql "$DATABASE_URL" -At -c "SELECT v.items FROM prd_version v JOIN service s ON s.id = v.service_id WHERE s.prefix = 'MKT' ORDER BY v.version DESC LIMIT 1" > /abs/mkt-prd.json
// 「PRD 관리」 응답(GET /api/prd)을 저장한 파일도 받는다 — items 를 꺼내 쓴다
// 칸 겹침은 case-consistency.ts 에 번호표를 세 번째 조각으로 준다: <폴더>,<표>,<번호표.json>

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import type { PrdItem } from '@platform/kit/types';

import { 대응읽기, 정답읽기, 채점줄, 채점하기 } from './eval-prd-score.js';

const 사용법 = '예: npx tsx scripts/eval-prd.ts ~/Projects/demo-market/docs/기획서.md /abs/mkt-prd.json --표 docs/cases/MKT.md --번호표 /abs/mkt-map.json';
function 멈추기(글: string): never {
  console.error(글);
  process.exit(2);
}
function 읽기(경로: string): string {
  if (!existsSync(경로)) 멈추기(`없는 경로입니다 — ${경로}`);
  return readFileSync(경로, 'utf8');
}

const { values: 선택, positionals: 위치 } = parseArgs({
  allowPositionals: true,
  options: { 대응표: { type: 'string' }, 표: { type: 'string' }, 번호표: { type: 'string' } },
});
const [기획서경로, prd경로] = 위치;
if (기획서경로 === undefined || prd경로 === undefined || 위치.length > 2) 멈추기(사용법);

const 정답 = 정답읽기(읽기(기획서경로));
if (정답.전체.size === 0) 멈추기(`정답지에 「| REQ-」 줄이 없습니다 — ${기획서경로}`);

let 원본: unknown;
try {
  원본 = JSON.parse(읽기(prd경로));
} catch (e) {
  // psql 이 빈 결과(접두사 틀림)나 안내 줄을 내면 여기서 걸린다
  멈추기(`PRD 파일이 JSON 이 아닙니다 — ${prd경로} — ${e instanceof Error ? e.message : String(e)}`);
}
const 항목들 = Array.isArray(원본) ? 원본 : (원본 as { items?: unknown } | null)?.items;
// 채점이 읽는 칸만 본다 — 손으로 저장한 파일도 받으므로 서버 검사에 기대지 않는다
const 항목꼴 = (x: unknown) => {
  const 항목 = x as Partial<PrdItem> | null;
  return (
    typeof 항목?.reqId === 'string' &&
    Array.isArray(항목.basis) &&
    항목.basis.every((b) => typeof b?.quote === 'string' && (b.ref === undefined || typeof b.ref === 'string'))
  );
};
if (!Array.isArray(항목들) || !항목들.every(항목꼴)) 멈추기(`PRD 항목 배열이 아닙니다 — ${prd경로}`);

const 채점 = 채점하기(
  항목들 as PrdItem[],
  정답,
  선택.대응표 === undefined ? [] : 대응읽기(읽기(선택.대응표)),
  선택.표 === undefined ? undefined : 읽기(선택.표),
);
for (const 줄 of 채점줄(채점, 정답)) console.log(줄);
if (선택.번호표 !== undefined) {
  // 빈 번호표는 칸 겹침을 조용히 「없음」으로 만든다 — case-consistency 도 거절한다
  if (채점.번호표.size === 0) 멈추기('정답지 번호에 닿는 PRD 항목이 없어 번호표를 쓰지 않았습니다');
  writeFileSync(선택.번호표, `${JSON.stringify(Object.fromEntries(채점.번호표), null, 2)}\n`);
  console.log(`번호표 ${String(채점.번호표.size)}줄 → ${선택.번호표}`);
}
