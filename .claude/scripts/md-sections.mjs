// 체인 문서 검사들이 마크다운 절 · 코드 펜스를 자를 때 같이 쓰는 도우미 (파일마다 사본을 두면 한쪽만 고쳐져 어긋난다)

// `## 제목` 부터 다음 `## ` 제목 전까지
export const 절 = (글, 제목) => {
  const 시작 = 글.indexOf(제목);
  if (시작 < 0) return '';
  const 나머지 = 글.slice(시작 + 제목.length);
  const 끝 = 나머지.search(/\n## /);
  return 끝 < 0 ? 나머지 : 나머지.slice(0, 끝);
};

// 제목과 같은 깊이 이하의 다음 제목 전까지 (코드 펜스 안의 `#` 줄은 제목이 아니다)
export const 소절 = (글, 제목) => {
  const 시작 = 글.indexOf(제목);
  if (시작 < 0) return '';
  const 깊이 = 제목.match(/^#+/)[0].length;
  const 제목줄 = new RegExp(`^#{1,${깊이}} `);
  const 모은 = [];
  let 펜스 = false;
  for (const 줄 of 글.slice(시작 + 제목.length).split('\n')) {
    if (/^```/.test(줄)) 펜스 = !펜스;
    if (!펜스 && 제목줄.test(줄)) break;
    모은.push(줄);
  }
  return 모은.join('\n');
};

// 표지가 든 코드 펜스 하나의 안쪽(펜스는 `소절` 처럼 줄 머리에서만 열고 닫는다) — 펜스 여럿을 이어 붙이면 다른 블록의 줄이 단언을 받쳐 준다
export const 펜스블록 = (글, 표지) => {
  for (const m of 글.matchAll(/^```[^\n]*\n([\s\S]*?)\n?^```[ \t]*$/gm)) {
    if (m[1].includes(표지)) return m[1];
  }
  return '';
};
