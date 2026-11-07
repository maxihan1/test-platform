// 실행 기록 › 호환성 › 실행 하나의 결과 — 머리 숫자 · 「화면 × 디바이스」 표 · 카드와 판정 · 미점검 · 미커버 (도메인/호환성 §8.17 ④)

import { useEffect, useState } from 'react';

import { CompatCards } from './CompatCards.js';
import { compatApi, type CompatCard } from './compatApi.js';
import { 묶음자리, 미점검구획, 요약띠, 카드자리, 화면표 } from './CompatResultParts.js';
import { CompatRunWindow } from './CompatRunWindow.js';
import { type 거르개, 카드묶기 } from './compatRunView.js';
import { 세트주소 } from './CompatSets.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { Failed, Loading, message, useAsync, when } from './ui.js';

const 거르개들: 거르개[] = ['미판정 먼저', '결함 확정', '전체'];

/** 그 자리로 부드럽게 내려간다. 펼친 뒤 그려질 때까지 한 프레임 기다린다 */
const 내려가기 = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

/**
 * @param service 띠의 애플리케이션 접두사 — 「세트 보기」 · 실행 기록 링크가 들고 간다
 * @param 쓰나 실행 write — 판정 단추가 선다
 */
export function CompatResult({ runId, service, 쓰나 }: { runId: number; service: string; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const res = useAsync(() => compatApi.run(runId), [runId]);
  const [거름, set거름] = useState<거르개>('미판정 먼저');
  const [펼친, set펼친] = useState<Set<string> | null>(null);
  const [누르는중, set누르는중] = useState<string | null>(null);
  const [오류, set오류] = useState<string | null>(null);
  // 도는 실행을 열면 실행 창을 같이 띄운다 — 결과는 도는 동안 비어 있다 (§7 「결과」 「돌거나 점검 중인 칸은 cells 에 없다」)
  const [창, set창] = useState(false);
  const data = res.data;

  useEffect(() => {
    if (data === null || 펼친 !== null) return;
    // 처음 열 때 첫 묶음만 편다 (시안 ④ — 둘째 묶음부터 「펼치기」)
    set펼친(new Set(카드묶기(data.rows, data.cards, '미판정 먼저').slice(0, 1).map((m) => m.key)));
    if (data.run.state === 'RUNNING') set창(true);
  }, [data, 펼친]);

  if (res.error !== null) return <Failed error={res.error} />;
  if (data === null || 펼친 === null) return <Loading />;

  const 묶음들 = 카드묶기(data.rows, data.cards, 거름);
  const 케이스수 = Math.max(0, ...data.devices.map((d) => d.cases.total));
  const 기록주소 = `#/runs/compat?service=${encodeURIComponent(service)}`;

  function 펼침(key: string) {
    set펼친((앞) => {
      const 새 = new Set(앞);
      if (새.has(key)) 새.delete(key);
      else 새.add(key);
      return 새;
    });
  }

  async function 판정(c: CompatCard, v: CompatCard['verdict']) {
    const 열쇠 = `${c.key}#${String(c.seq)}`;
    set누르는중(열쇠);
    set오류(null);
    try {
      await compatApi.verdict(runId, c.key, c.seq, v);
      await res.reload();
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set누르는중(null);
    }
  }

  return (
    <>
      <Head
        위치={t('실행 기록 › 호환성')}
        제목={t('{세트} · 호환성 결과', { 세트: data.run.title })}
        부제={[
          when(data.run.startedAt, 언어),
          ...(data.run.buildNo == null ? [] : [t('빌드 {번호}', { 번호: data.run.buildNo })]),
          t('디바이스 {수}대', { 수: data.counts.devices }),
          t('케이스 {수}건', { 수: 케이스수 }),
          t('실행자 {이름}', { 이름: data.run.startedBy }),
        ].join(' · ')}
        행동={
          data.run.state === 'RUNNING' ? (
            <button type="button" className="btn" onClick={() => set창(true)}>
              {t('실행 창 열기')}
            </button>
          ) : undefined
        }
      />
      <div className="screen compat-result">
        <p className="compat-back">
          <a href={기록주소}>{t('실행 기록 › 호환성')}</a> › <span className="mono">RUN {runId}</span>
        </p>
        {data.run.state === 'RUNNING' ? <p className="compat-faint">{t('실행 중입니다 · 돌거나 점검 중인 디바이스의 칸은 끝나면 채워집니다')}</p> : null}
        {오류 === null ? null : (
          <p className="compat-err" role="alert">
            {오류}
          </p>
        )}
        <요약띠 counts={data.counts} />
        <화면표
          data={data}
          칸누름={(key, seq, 미점검) => {
            if (미점검) return 내려가기('cr-unchecked');
            // 확정만 보는 중이면 미판정 카드가 숨어 있다 — 전체로 돌려 보이게 한다
            if (거름 === '결함 확정') set거름('전체');
            set펼친((앞) => new Set([...(앞 ?? []), key]));
            내려가기(카드자리(key, seq));
          }}
        />
        <div className="chip-group cr-filters" role="group" aria-label={t('카드 거르기')}>
          {거르개들.map((g) => (
            <button key={g} type="button" className="chip" aria-pressed={거름 === g} onClick={() => set거름(g)}>
              {t(g)}
            </button>
          ))}
        </div>
        <CompatCards
          runId={runId}
          묶음들={묶음들}
          rows={data.rows}
          devices={data.devices}
          펼친={펼친}
          on펼침={(key) => {
            펼침(key);
            if (!펼친.has(key)) 내려가기(묶음자리(key));
          }}
          쓰나={쓰나}
          누르는중={누르는중}
          on판정={(c, v) => void 판정(c, v)}
        />
        <미점검구획 data={data} 세트주소={세트주소(data.run.setId, service)} />
      </div>
      {창 ? (
        <CompatRunWindow
          runId={runId}
          닫기={() => {
            set창(false);
            void res.reload();
          }}
        />
      ) : null}
    </>
  );
}
