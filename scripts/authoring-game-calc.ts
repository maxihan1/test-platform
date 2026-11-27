// 게임 전략 계산기 — 버틸 수 있나 · 재화 예산 · 설치 자리 고르기. 피해 계산을 AI 가 머리로 하면 자주 틀려서 숫자는 이 스크립트가 낸다
// 쓰는 법: AI 가 입력 JSON 을 쓰고 `npx tsx scripts/authoring-game-calc.ts <입력 파일>` — 숫자와 지도 CALC 줄 초안(JSON 한 줄)을 찍는다. 틀린 입력은 2 로 끝난다
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

export type 점 = readonly [number, number];
export interface 원 { 중심: 점; 반지름: number }

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 수인가 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 글없으면 = (v: unknown, 없을때: string): string => (글인가(v) ? v : 없을때);
const 점인가 = (v: unknown): v is 점 => Array.isArray(v) && v.length === 2 && v.every(수인가);
const 소수 = (n: number): number => Math.round(n * 100) / 100;

/** 길(꺾은선)이 원 안을 지나는 길이 — 선분마다 원과 만나는 구간만 센다 */
export function 원안길이(길: readonly 점[], 원: 원): number {
  let 합 = 0;
  for (let i = 0; i + 1 < 길.length; i += 1) {
    const [ax, ay] = 길[i]!;
    const [bx, by] = 길[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const fx = ax - 원.중심[0];
    const fy = ay - 원.중심[1];
    const a = dx * dx + dy * dy;
    if (a === 0) continue;
    const b = 2 * (fx * dx + fy * dy);
    const 판별 = b * b - 4 * a * (fx * fx + fy * fy - 원.반지름 ** 2);
    if (판별 <= 0) continue;
    const 근 = Math.sqrt(판별);
    const t1 = Math.max(0, (-b - 근) / (2 * a));
    const t2 = Math.min(1, (-b + 근) / (2 * a));
    if (t2 > t1) 합 += (t2 - t1) * Math.sqrt(a);
  }
  return 합;
}

const 안인가 = (p: 점, 원: 원): boolean => Math.hypot(p[0] - 원.중심[0], p[1] - 원.중심[1]) <= 원.반지름;

export interface 계산결과 { 이름: string; 글: string; 줄글: string[]; 결과: Record<string, unknown>; 입력요약: Record<string, unknown> }
type 입력틀림 = { 틀림: string };

const 길읽기 = (v: unknown): 점[] | string => (Array.isArray(v) && v.length >= 2 && v.every(점인가) ? (v as 점[]) : '길 은 [[x, y], [x, y], …] 점 둘 이상이다');
const 목록 = (v: unknown, 이름: string): unknown[] | string => (Array.isArray(v) && v.length > 0 ? v : `${이름} 은 하나 이상 적은 목록이다`);

export function 버티기(입력: Record<string, unknown>): 계산결과 | 입력틀림 {
  const 길 = 길읽기(입력.길);
  const 탑들 = 목록(입력.설치물, '설치물');
  const 웨이브들 = 목록(입력.웨이브, '웨이브');
  if (typeof 길 === 'string') return { 틀림: 길 };
  if (typeof 탑들 === 'string') return { 틀림: 탑들 };
  if (typeof 웨이브들 === 'string') return { 틀림: 웨이브들 };
  const 설치 = [];
  for (const [i, t] of 탑들.entries()) {
    const x = 객체(t);
    if (!글인가(x.이름) || !점인가(x.자리) || !수인가(x.사거리) || !수인가(x.공격력) || !수인가(x.간격) || x.간격 <= 0 || (x.타깃수 !== undefined && !수인가(x.타깃수)) || (x.수 !== undefined && !수인가(x.수)) || (x.부터 !== undefined && !수인가(x.부터))) {
      return { 틀림: `설치물 ${i + 1}번은 { 이름, 자리: [x, y], 사거리, 공격력, 간격(0 보다 큼, 초), 타깃수?, 수?, 부터?(몇 웨이브부터, 기본 1) } 이다` };
    }
    const 덮음 = 원안길이(길, { 중심: x.자리, 반지름: x.사거리 });
    설치.push({ 이름: x.이름, 수: x.수 ?? 1, 부터: x.부터 ?? 1, 공격력: x.공격력, 간격: x.간격, 타깃수: x.타깃수 ?? 1, 덮음, 초당피해: (x.공격력 * (x.타깃수 ?? 1)) / x.간격 });
  }
  const 줄글: string[] = ['설치물 — 길을 덮는 길이 · 초당 피해(공격력 × 타깃수 / 간격)', ...설치.map((t) => `  ${t.이름} ×${t.수} 덮음 ${소수(t.덮음)} · 초당 ${소수(t.초당피해)}`)];
  const 결과웨이브 = [];
  for (const [i, w] of 웨이브들.entries()) {
    const x = 객체(w);
    const 적들 = Array.isArray(x.적) ? x.적.map(객체) : [];
    if (적들.length === 0 || 적들.some((e) => !글인가(e.종류) || !수인가(e.수) || !수인가(e.체력) || !수인가(e.속도) || e.속도 <= 0) || (x.출현간격 !== undefined && (!수인가(x.출현간격) || x.출현간격 < 0))) return { 틀림: `웨이브 ${i + 1}번은 { 이름?, 출현간격?(적이 나오는 간격, 초, 0 이상), 적: [{ 종류, 수, 체력, 속도(길 단위/초, 0 보다 큼) }] } 이다` };
    const 체력합 = 적들.reduce((a, e) => a + (e.수 as number) * (e.체력 as number), 0);
    // 설치물은 초당 공격력 × 타깃수 / 간격 만큼 주고, 그 웨이브가 사거리 안에 머무는 동안만 준다 — 가장 느린 적이 덮은 길을 지나는 시간 + 마지막 적이 나올 때까지.
    // ponytail: 타깃이 언제나 타깃수만큼 있다고 본 위쪽 한계다 — 몰려서 타깃수를 못 채우면 실제는 낮고, 다 못 버티면 이 값으로도 못 버틴다
    const 총수 = 적들.reduce((a, e) => a + (e.수 as number), 0);
    const 느린속도 = Math.min(...적들.map((e) => e.속도 as number));
    const 피해합 = 설치.filter((t) => t.부터 <= i + 1).reduce((a, t) => a + t.초당피해 * t.수 * (t.덮음 > 0 ? t.덮음 / 느린속도 + ((x.출현간격 as number | undefined) ?? 0) * (총수 - 1) : 0), 0);
    const 이름 = 글없으면(x.이름, `${i + 1}웨이브`);
    결과웨이브.push({ 이름, 체력합: 소수(체력합), 피해합: 소수(피해합), 버팀: 피해합 >= 체력합, 모자란: 소수(Math.max(0, 체력합 - 피해합)) });
    줄글.push(`${이름} 체력 합 ${소수(체력합)} · 줄 수 있는 피해 ${소수(피해합)} → ${피해합 >= 체력합 ? '버틴다' : `못 버틴다(${소수(체력합 - 피해합)} 모자람)`}`);
  }
  const 못 = 결과웨이브.find((w) => !w.버팀);
  const 글 = 못 === undefined ? `모든 웨이브 버틴다(${결과웨이브.length}웨이브)` : `${못.이름} 에서 못 버틴다(체력 ${못.체력합} · 피해 ${못.피해합} · ${못.모자란} 모자람)`;
  return { 이름: '버티기', 글, 줄글, 결과: { 웨이브: 결과웨이브, 처음못버팀: 못?.이름 ?? null }, 입력요약: { 설치물: 설치.map((t) => `${t.이름}×${t.수}`), 웨이브수: 웨이브들.length, 길점수: 길.length } };
}

export function 예산(입력: Record<string, unknown>): 계산결과 | 입력틀림 {
  const 웨이브들 = 목록(입력.웨이브, '웨이브');
  if (typeof 웨이브들 === 'string') return { 틀림: 웨이브들 };
  if (입력.시작 !== undefined && !수인가(입력.시작)) return { 틀림: '시작 은 처음에 받는 재화 수다' };
  let 남음 = (입력.시작 as number | undefined) ?? 0;
  const 줄글: string[] = [];
  const 결과웨이브 = [];
  for (const [i, w] of 웨이브들.entries()) {
    const x = 객체(w);
    const 지출들 = x.지출 === undefined ? [] : Array.isArray(x.지출) ? x.지출.map(객체) : null;
    if (지출들 === null || 지출들.some((g) => !글인가(g.무엇) || !수인가(g.값) || (g.수 !== undefined && !수인가(g.수))) || (x.처치 !== undefined && !수인가(x.처치)) || (x.보상 !== undefined && !수인가(x.보상)) || (x.웨이브보상 !== undefined && !수인가(x.웨이브보상)) || (x.유지비 !== undefined && !수인가(x.유지비))) {
      return { 틀림: `웨이브 ${i + 1}번은 { 이름?, 처치?, 보상?(처치 하나당), 웨이브보상?, 유지비?, 지출?: [{ 무엇, 값, 수? }] } 이다` };
    }
    // 처치 보상은 싸우는 중에 들어오니 이 웨이브 지출에는 못 쓴다 — 웨이브 시작에 가진 양으로 지출을 감당하는지 본다
    const 가진 = 남음 + ((x.웨이브보상 as number | undefined) ?? 0);
    const 지출 = 지출들.reduce((a, g) => a + (g.값 as number) * ((g.수 as number | undefined) ?? 1), 0) + ((x.유지비 as number | undefined) ?? 0);
    const 처치수입 = ((x.처치 as number | undefined) ?? 0) * ((x.보상 as number | undefined) ?? 0);
    남음 = 가진 - 지출 + 처치수입;
    const 이름 = 글없으면(x.이름, `${i + 1}웨이브`);
    결과웨이브.push({ 이름, 가진: 소수(가진), 지출: 소수(지출), 처치수입: 소수(처치수입), 남음: 소수(남음), 모자람: 지출 > 가진 });
    줄글.push(`${이름} 시작에 ${소수(가진)} · 지출 ${소수(지출)} · 처치 수입 ${소수(처치수입)} → 남음 ${소수(남음)}${지출 > 가진 ? ' (지출이 가진 양보다 많다 — 모자란다)' : ''}`);
  }
  const 처음 = 결과웨이브.find((w) => w.모자람);
  return { 이름: '예산', 글: 처음 === undefined ? `끝까지 모자라지 않는다(마지막 남음 ${소수(남음)})` : `${처음.이름} 에서 처음 모자란다(가진 ${처음.가진} · 지출 ${처음.지출})`, 줄글, 결과: { 웨이브: 결과웨이브, 처음모자람: 처음?.이름 ?? null }, 입력요약: { 시작: 입력.시작 ?? 0, 웨이브수: 웨이브들.length } };
}

export function 자리(입력: Record<string, unknown>): 계산결과 | 입력틀림 {
  const 길 = 길읽기(입력.길);
  const 후보들 = 목록(입력.후보, '후보');
  if (typeof 길 === 'string') return { 틀림: 길 };
  if (typeof 후보들 === 'string') return { 틀림: 후보들 };
  if (!수인가(입력.사거리) || 입력.사거리 <= 0) return { 틀림: '사거리 는 0 보다 큰 수다' };
  const 못 = Array.isArray(입력.못놓는곳) ? 입력.못놓는곳.map(객체) : [];
  if (못.some((m) => !점인가(m.중심) || !수인가(m.반지름))) return { 틀림: '못놓는곳 은 [{ 중심: [x, y], 반지름 }] 이다' };
  const 나옴 = [];
  const 뺌: string[] = [];
  for (const [i, c] of 후보들.entries()) {
    const x = 객체(c);
    if (!글인가(x.이름) || !점인가(x.자리)) return { 틀림: `후보 ${i + 1}번은 { 이름, 자리: [x, y] } 이다` };
    if (못.some((m) => 안인가(x.자리 as 점, { 중심: m.중심 as 점, 반지름: m.반지름 as number }))) 뺌.push(x.이름);
    else 나옴.push({ 이름: x.이름, 덮음: 소수(원안길이(길, { 중심: x.자리 as 점, 반지름: 입력.사거리 })) });
  }
  나옴.sort((a, b) => b.덮음 - a.덮음);
  const 전체 = 길.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - 길[i]![0], p[1] - 길[i]![1]), 0);
  if (전체 === 0) return { 틀림: '길 의 점들이 한 자리라 길이가 0 이다 — 서로 다른 점을 적는다' };
  return {
    이름: '자리',
    글: 나옴.length === 0 ? '놓을 수 있는 후보가 없다' : `덮는 길이 순서 ${나옴.map((x) => `${x.이름} ${x.덮음}`).join(' > ')}${뺌.length === 0 ? '' : ` (못 놓아 뺌 ${뺌.join(' · ')})`}`,
    줄글: [`길 전체 ${소수(전체)} · 사거리 ${입력.사거리}`, ...나옴.map((x) => `  ${x.이름} 덮음 ${x.덮음} (${소수((x.덮음 / 전체) * 100)}%)`), ...뺌.map((n) => `  ${n} 못 놓는 곳이라 뺌`)],
    결과: { 순서: 나옴, 뺌, 길전체: 소수(전체) },
    입력요약: { 사거리: 입력.사거리, 후보수: 후보들.length, 못놓는곳수: 못.length },
  };
}

const 계산들: Record<string, (입력: Record<string, unknown>) => 계산결과 | 입력틀림> = { 버티기, 예산, 자리 };

export function 계산하기(입력: unknown, 파일이름: string): 계산결과 | 입력틀림 {
  const x = 객체(입력);
  const 풀이 = typeof x.계산 === 'string' ? 계산들[x.계산] : undefined;
  if (풀이 === undefined) return { 틀림: `계산 은 ${Object.keys(계산들).join(' · ')} 중 하나다` };
  const r = 풀이(x);
  return '틀림' in r ? r : { ...r, 이름: 글없으면(x.이름, 파일이름) };
}

/** 지도 CALC 줄 초안 — 계산 직후라 아직 짐작(GUESS)이다. 놀아 보고 예측이 맞으면 AI 가 확인으로 올린다 */
export function 줄초안(r: 계산결과, 입력: Record<string, unknown>): Record<string, unknown> {
  const 빌드데이터썼나 = 입력.빌드데이터 === true;
  const text = `${r.이름}: ${r.글}${빌드데이터썼나 ? ' (빌드 데이터 값 씀)' : ''}`.slice(0, 1000);
  return { kind: 'CALC', key: `calc:${r.이름}`, name: r.이름, learned: { text, belief: 'GUESS', data: { 입력: r.입력요약, 결과: r.결과, ...(글인가(입력.곳) ? { 곳: 입력.곳 } : {}), ...(빌드데이터썼나 ? { 출처: '빌드 데이터' } : {}) } } };
}

function 실행(): void {
  const 파일 = process.argv[2];
  if (파일 === undefined) {
    process.stderr.write('쓰는 법: npx tsx scripts/authoring-game-calc.ts <입력 JSON 파일>\n');
    process.exit(2);
  }
  let 입력: unknown;
  try {
    입력 = JSON.parse(readFileSync(파일, 'utf8'));
  } catch (e) {
    process.stderr.write(`입력 파일을 못 읽었다(${파일}) — ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
  const r = 계산하기(입력, basename(파일).replace(/\.json$/, ''));
  if ('틀림' in r) {
    process.stderr.write(`입력이 틀렸다 — ${r.틀림}\n`);
    process.exit(2);
  }
  process.stdout.write(`${r.줄글.join('\n')}\n결론: ${r.글}\n지도 CALC 줄 초안\n${JSON.stringify(줄초안(r, 객체(입력)))}\n`);
}

if (process.argv[1] !== undefined && /authoring-game-calc\.[tj]s$/.test(process.argv[1])) 실행();
