// 증적 항목 하나를 그리는 조각 — 판정 배지 · 항목 한 줄 · §8.4 블록의 몸(사전조건 · 입력 · 기대 결과 · 절차). 배치는 html.ts 가 한다

import type { EvidenceAssertion, EvidenceField, EvidenceItem, EvidenceStep } from './collect.js';

/** 화면 표기는 PC / 모바일이다. desktop / mobile 은 코드 안에서만 쓴다 (SPEC §2 · web/ui.tsx) */
export const 디바이스: Record<EvidenceItem['platform'], string> = { desktop: 'PC', mobile: '모바일', android: 'Android 앱' };

/** 판정 색은 통과 초록 · 실패 빨강 · 미실행 회색 셋뿐이다 (docs/DESIGN.md 「색은 판정만 갖는다」) */
const 판정색: Record<EvidenceItem['status'], string> = {
  PASS: 'v-pass',
  FAIL: 'v-fail',
  NA: 'v-na',
  NOT_RUN: 'v-na',
};

// NA 와 NOT_RUN 이 같은 낱말인 것은 겹친 것이 아니라 SPEC 이 정한 표기다. 배지는 셋뿐이고
// 「돌다가 판정을 못 냈다」와 「아예 안 돌았다」를 가르는 것은 옆에 붙는 사유 한 문장이다 (SPEC §8.3)
export const 판정글자: Record<EvidenceItem['status'], string> = {
  PASS: '통과',
  FAIL: '실패',
  NA: '미실행',
  NOT_RUN: '미실행',
};

// 케이스 이름과 검증 문장은 사람이 적은 글이다. < 나 & 가 그대로 나가면 문서가 깨지거나 값이 조용히 사라진다
export function 안전(값: string): string {
  return 값
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function 판정(status: EvidenceItem['status']): string {
  return `<span class="verdict ${판정색[status]}">${판정글자[status]}</span>`;
}

function 소요(durationMs: number | null): string {
  return durationMs === null ? '' : `<span class="ms">(${durationMs}ms)</span>`;
}

function 검증(a: EvidenceAssertion): string {
  // 한 문장 = 한 줄이다. 기대·실제·판정이 줄을 넘어가면 훑을 수 없다 (SPEC §8.4)
  const 중단 = a.blocker ? '<span class="blocker">실행 중단</span>' : '';
  return `      <div class="assert ${판정색[a.status]}"><span class="mark">${a.status === 'PASS' ? '✓' : '✗'}</span><span class="stmt">${안전(a.statement)}</span><span class="exp">기대 ${안전(a.expected)}</span><span class="act">실제 ${안전(a.actual)}</span>${판정(a.status)}${중단}</div>`;
}

function 스텝(s: EvidenceStep): string[] {
  const 줄들 = s.assertions.map(검증);

  if (s.screenshotPath !== null) {
    // 어느 확인에서 깨졌는지와 그때 화면이 나란히 붙어야 의미가 있다. 스텝 헤더 아래가 아니다 (SPEC §8.4)
    const 깨진곳 = s.assertions.findIndex((a) => a.status === 'FAIL');
    const 자리 = 깨진곳 === -1 ? 줄들.length : 깨진곳 + 1;
    줄들.splice(자리, 0, `      <img class="shot" src="${안전(s.screenshotPath)}" alt="${안전(s.title)} 화면">`);
  }

  return [
    `    <div class="step">`,
    // 건너뛴 「만들기」 절차는 판정 없이 PASS 로 적힌다. 「통과」로 찍으면 준비까지 한 것으로 읽힌다 (도메인/리포팅 §8.4)
    `      <div class="step-head"><span class="seq">${s.seq}.</span><span class="step-title">${안전(s.title)}</span>${s.skipped === true ? '<span class="badge">건너뜀</span>' : `${판정(s.status)}${소요(s.durationMs)}`}</div>`,
    ...줄들,
    `    </div>`,
  ];
}

function 필드행(라벨: string, 칸: EvidenceField[], 빈말: string): string[] {
  const 값 =
    칸.length === 0
      ? `      <div class="none">${빈말}</div>`
      : 칸
          .map(
            (f) =>
              `      <div class="field"><span class="f-label">${안전(f.label)}</span><span class="f-value">${안전(f.value)}</span></div>`,
          )
          .join('\n');

  return [`    <div class="row">`, `      <div class="row-k">${라벨}</div>`, `      <div class="row-v">`, 값, `      </div>`, `    </div>`];
}

/** 항목 한 줄 — 디바이스 · 회차 · 판정 · 소요 · 사유. 카드의 디바이스 머리 · 접힌 줄 · 부록 머리가 같은 줄이다 */
export function 항목줄(item: EvidenceItem, 덧말 = ''): string {
  // 배지 옆에 붙인다. 떨어뜨리면 러너 고장과 사람이 멈춘 것을 구분할 수 없다 (SPEC §8.3)
  const 사유 = item.notRunReason === null ? '' : `<span class="not-run">${안전(item.notRunReason)}</span>`;
  return `<span class="badge">${디바이스[item.platform]}</span><span class="badge">${item.attempt}회차</span>${판정(item.status)}${소요(item.durationMs)}${덧말}${사유}`;
}

/** §8.4 블록의 몸 — 사전조건 · 입력 · 기대 결과 · 시험 절차. 케이스 이름은 카드 · 줄 · 부록 머리가 한 번 적는다 */
export function 본문(item: EvidenceItem): string[] {
  const 사전 =
    item.precondition.length === 0
      ? [`      <div class="none">사전조건 없음</div>`]
      : item.precondition.map((p) => `      <div class="pre">· ${안전(p)}</div>`);

  const 절차 =
    item.steps.length === 0
      ? []
      : [`    <div class="row">`, `      <div class="row-k">시험 절차</div>`, `      <div class="row-v">`, ...item.steps.flatMap(스텝), `      </div>`, `    </div>`];

  return [
    `    <div class="row">`,
    `      <div class="row-k">사전조건</div>`,
    `      <div class="row-v">`,
    ...사전,
    `      </div>`,
    `    </div>`,
    ...필드행('입력', item.params, '입력 없음'),
    ...필드행('기대 결과', item.expected, '기대 결과 없음'),
    ...절차,
    ...(item.farm == null ? [] : [`    <div class="row">`, `      <div class="row-k">팜 기록</div>`, `      <div class="row-v">${안전(item.farm)}</div>`, `    </div>`]),
  ];
}
