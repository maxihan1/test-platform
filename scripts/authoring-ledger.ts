// 원장 — 기획서 글자본에서 요구 번호 목록을 뽑는다. 표와 맞대는 쪽은 authoring-ledger-check.ts 다
// 자식(AI)이 아니라 이 스크립트가 뽑는다 — 같은 글이면 같은 원장이 나와야 대조가 성립한다 (도메인/작성 §3.6 「★ 원장」)

export interface 원장항목 {
  번호: string;
  /** 어느 자료에서 나왔나 — 자료 이름 */
  자료: string;
  /** 문단 모드만 — 첫 80자. 자식이 P-012 가 어느 글인지 알아야 한다 */
  글?: string;
}

export interface 자료원장 {
  모드: '번호' | '문단';
  항목: 원장항목[];
  /** 번호 모드 가족별 개수. 화면 ID · 오류 코드 가족이 섞였으면 사람이 여기서 본다 */
  가족: Record<string, number>;
  경고: string[];
}

// 앞뒤 경계는 [A-Za-z0-9.-] 가 아닌 글자 — 조사 · 괄호 · 표 칸은 잡고 긴 번호 속 짧은 번호는 안 잡는다.
// 뒤쪽 마침표는 숫자가 이어질 때만 번호다(FR-1.2). 문장 끝 마침표는 번호가 아니다
const 번호꼴 = String.raw`[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d+(?:\.\d+)*`;
const 번호식 = new RegExp(String.raw`(?<![A-Za-z0-9.\-])(${번호꼴})(?![A-Za-z0-9\-]|\.\d)`, 'g');
const 범위뒤식 = new RegExp(String.raw`^\s*[~～]\s*(?:(${번호꼴})|(\d+))(?![A-Za-z0-9\-]|\.\d)`);
const 범위상한 = 200;

/** 번호의 가족 — 맨 끝 `-숫자` 앞. `REQ-COM-001` → `REQ-COM` */
export function 가족(번호: string): string {
  return 번호.slice(0, 번호.lastIndexOf('-'));
}

function 끝숫자(번호: string): string {
  return 번호.slice(번호.lastIndexOf('-') + 1);
}

/** 범위 양 끝을 펼친다. 못 펼치면 null — 부르는 쪽이 양 끝만 두고 경고한다 */
function 펼치기(시작: string, 끝: string): string[] | null {
  if (가족(시작) !== 가족(끝)) return null;
  const [a, b] = [끝숫자(시작), 끝숫자(끝)];
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) return null;
  const [s, e] = [Number(a), Number(b)];
  if (e <= s || e - s + 1 > 범위상한) return null;
  // 0 으로 채운 번호(001)만 자릿수를 맞춘다. 채우지 않은 번호(8~10)는 그대로
  const 폭 = a.length > 1 && a.startsWith('0') ? a.length : 0;
  return Array.from({ length: e - s + 1 }, (_, i) => `${가족(시작)}-${String(s + i).padStart(폭, '0')}`);
}

/** 글에서 번호를 나온 순서대로 찾는다(중복 포함). 추출과 대조가 이 함수 하나를 쓴다 */
export function 번호찾기(글: string): { 번호들: string[]; 경고: string[] } {
  const 번호들: string[] = [];
  const 경고: string[] = [];
  for (const m of 글.matchAll(번호식)) {
    const 시작 = m[1];
    if (시작 === undefined) continue;
    // 범위의 끝은 이 반복에서 이미 처리했다 — 끝이 온전한 번호면 다음 매치로 다시 나온다
    const 앞 = 글.slice(0, m.index);
    if (/[~～]\s*$/.test(앞)) continue;
    const 뒤 = 범위뒤식.exec(글.slice(m.index + 시작.length));
    if (뒤 === null) {
      번호들.push(시작);
      continue;
    }
    const 끝 = 뒤[1] ?? `${가족(시작)}-${뒤[2] ?? ''}`;
    const 펼친것 = 펼치기(시작, 끝);
    if (펼친것 === null) {
      번호들.push(시작, 끝);
      경고.push(`범위 ${시작}~${끝} 를 펼치지 못해 양 끝만 넣었다`);
    } else {
      번호들.push(...펼친것);
    }
  }
  return { 번호들, 경고 };
}

/** 가족마다 서로 다른 번호가 셋 이상이면 요구 번호 체계로 본다 — 외톨이(UTF-8 · ISO-9001)를 거른다 */
const 가족하한 = 3;

/** 자료 하나의 원장. 번호 가족이 없으면 문단 모드다 */
export function 원장뽑기(글: string, 자료: string): 자료원장 {
  const { 번호들, 경고 } = 번호찾기(글);
  const 차례 = [...new Set(번호들)];
  const 셈: Record<string, number> = {};
  for (const 번호 of 차례) 셈[가족(번호)] = (셈[가족(번호)] ?? 0) + 1;
  const 가족들 = Object.fromEntries(Object.entries(셈).filter(([, n]) => n >= 가족하한));
  const 항목 = 차례.filter((번호) => 가족(번호) in 가족들).map((번호) => ({ 번호, 자료 }));
  return { 모드: '번호', 항목, 가족: 가족들, 경고 };
}
