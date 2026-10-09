// docs/wbs.md 를 영역 → 기능 → 태스크로 펴고 진행판 HTML 에 데이터를 넣는다.
//
// node 표준 모듈만 쓴다 — CI 의 문서 차선은 설치 전에 이 검사를 돌린다(check:spec 과 같은 자리).
// 형식은 Devicefarm scripts/build_progress.py 를 옮겼다. 다른 점 하나 — 완료 날짜를 git 에서 캐지 않고 근거 줄에 적는다.

const BOX = /^- \[[ xX]\]/;
const TASK = /^- \[( |x|X)\] `([A-Z0-9]+-[A-Za-z0-9.-]+)` (.+)$/;
const AREA = /^## ([A-Z0-9]+) — (.+?)\s*$/;
const FEAT = /^### (.+?)(?: · (Phase [0-9.]+))?\s*$/;
const EVID = /근거 PR #(\d+) · (\d{4}-\d{2}-\d{2})/;

export function parseWbs(text) {
  const lines = text.split(/\r?\n/);
  const areas = [];
  let area = null;
  let feat = null;
  lines.forEach((line, i) => {
    let m;
    if (line.startsWith('## ')) {
      // 영역이 아닌 ## 절(안내 등)도 현재 영역을 끊는다
      m = AREA.exec(line);
      area = m ? { key: m[1], name: m[2], features: [] } : null;
      if (area) areas.push(area);
      feat = null;
    } else if (area && (m = FEAT.exec(line))) {
      feat = { name: m[1], phase: m[2] ?? '', what: '', tasks: [] };
      area.features.push(feat);
    } else if (feat && line.startsWith('**무엇**') && !feat.what) {
      feat.what = line.replace('**무엇**', '').trim();
    } else if (BOX.test(line)) {
      // 체크박스 줄은 전부 태스크로 읽히거나 실패한다 — 영역 제목 오타(— 대신 -) 하나로 태스크가 진행판에서 조용히 빠졌다 (코드 검토 2026-09-29)
      if (!area) throw new Error(`${i + 1}행 체크박스가 영역 밖이다 — 위의 「## KEY — 이름」 제목을 확인한다`);
      if (!(m = TASK.exec(line))) throw new Error(`${i + 1}행 체크박스가 「- [ ] \`KEY-번호\` 제목」 모양이 아니다`);
      if (!feat) throw new Error(`${i + 1}행 태스크가 기능 제목 밖에 있다`);
      const ev = EVID.exec(lines[i + 1] ?? '');
      feat.tasks.push({
        id: m[2],
        title: m[3].trim(),
        done: m[1] !== ' ',
        pr: ev ? Number(ev[1]) : null,
        evidence: ev ? `PR #${ev[1]}` : null,
        date: ev ? ev[2] : null,
      });
    }
  });
  return areas;
}

/** 템플릿의 `/*__DATA__*\/null` 자리에 데이터를 넣는다. 제목에 </script> 가 들어와도 스크립트 블록이 안 끊기게 </ 를 막는다 */
export function renderProgress(data, template) {
  const 자리 = '/*__DATA__*/null';
  if (!template.includes(자리)) throw new Error('템플릿에 데이터 자리(/*__DATA__*/null)가 없다');
  return template.replace(자리, () => JSON.stringify(data).replace(/<\//g, '<\\/'));
}
