// 증적 문서 버튼의 상태와 받는 법 (SPEC §8.4)
// 증적은 실행 단위 1부이므로 버튼은 항목 상세가 아니라 실행 결과의 RUN 머리에 둔다

import type { EvidenceRow } from './api.js';
import { 할수있나, type 등급 } from './role.js';
import { 도는중 } from './runState.js';

export interface 증적버튼모양 {
  누를수있나: boolean;
  글: string;
  /** 실패했을 때 사람이 읽을 한 문장. 원문 오류를 그대로 쓰지 않는다 */
  사유: string | null;
}

/**
 * RUN 머리의 증적 버튼 (SPEC §8.4 표).
 *
 * **「만드는 중」은 화면이 아니라 DB 가 기억한다** — `PENDING` 행이 그 표시다.
 * 화면 상태로만 막으면 새로고침할 때마다 또 눌리고 문서 행이 쌓인다.
 *
 * 보기만 등급에게는 `null` 이다. 만드는 것은 서버에 파일을 남기는 쓰기라
 * 실행까지부터다 (§3.5). **받기는 보기만도 할 수 있다** — 그건 아래 `받는법` 이 맡는다.
 */
export function 증적버튼(status: string, 문서들: EvidenceRow[], role: 등급 | null): 증적버튼모양 | null {
  if (!할수있나(role, '증적만들기')) return null;

  if (도는중(status)) {
    return { 누를수있나: false, 글: '실행이 끝나면 만들 수 있습니다', 사유: null };
  }

  const 만드는중 = 문서들.find((it) => it.status === 'PENDING');
  if (만드는중 !== undefined) {
    return { 누를수있나: false, 글: '만드는 중입니다', 사유: null };
  }

  const 실패 = 문서들.find((it) => it.status === 'FAILED');
  if (실패 !== undefined) {
    return { 누를수있나: true, 글: '다시 만들기', 사유: 실패.error ?? '알 수 없는 사유로 만들지 못했습니다' };
  }

  // 이미 만든 것이 있어도 다시 만들 수 있다.
  // 같은 실행의 증적은 언제 뽑아도 같은 문서가 나오므로 내용이 달라지지 않는다 (§3.3)
  return { 누를수있나: true, 글: 문서들.length === 0 ? '증적 문서 만들기' : '다시 만들기', 사유: null };
}

/** 브라우저가 열 수 있는 형식. 나머지는 내려받는다 */
const 열리는형식 = ['PDF', 'HTML'];

/**
 * 만든 문서를 어떻게 받나 (SPEC §8.4).
 *
 * **「열린다」고 해 놓고 파일이 떨어지면 사람이 어디로 갔는지 찾는다.**
 * 그래서 버튼 글자가 형식에 따라 다르다. 모르는 형식은 받기로 둔다 —
 * 틀리는 방향을 「파일이 떨어진다」 쪽에 두면 적어도 어디 있는지는 안다.
 */
export function 받는법(format: string): { 글: string; 새창: boolean } {
  const 새창 = 열리는형식.includes(format.toUpperCase());
  return { 글: 새창 ? '열기 ↗' : '받기', 새창 };
}
