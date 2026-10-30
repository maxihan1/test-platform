// 성능 테스트 › 페이지 성능 — 측정 조건 · 페이지별 결과 표 · 워터폴. 처음 열면 가장 최근 측정을 보이고 「측정」으로 새로 잰다 (도메인/성능 §8.14 · 시안 WebSpeed)

import { useEffect, useState } from 'react';

import type { ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { perfApi, type 실행상세, type 실행줄 } from './perfApi.js';
import type { Compare, PageRow, 측정페이지, 페이지기기, 페이지망, 페이지추천 } from './perfPageApi.js';
import { PerfPagesPick } from './PerfPagesPick.js';
import { PerfPagesTable, PerfPagesTiles } from './PerfPagesTable.js';
import { PerfPagesWaterfall } from './PerfPagesWaterfall.js';
import { 처음고른 } from './perfPagesView.js';
import { 도는중인가, 시각글 } from './perfRunView.js';
import { Loading, message } from './ui.js';
import { 묻는간격, usePerfJob } from './usePerfJob.js';

interface 읽은것 {
  run: 실행상세;
  pages: PageRow[];
  compare: Compare | null;
}

/** AI 가 고른 것이거나 그 실행에서 가져온 목록이면 「AI」, 사람이 창에서 고쳤거나 메인 하나로 대신했으면 직접 */
type 출처 = 'AI' | 'MANUAL';

/** 쓸 만한 실행 가운데 가장 최근 것. 오류 · 중단으로 끝난 실행은 보일 숫자가 없어 뒤로 미룬다 */
function 가장최근번호(줄들: 실행줄[]): number | null {
  const 쓸만 = 줄들.filter((줄) => 줄.status !== 'ERROR' && 줄.status !== 'STOPPED');
  return (쓸만.length > 0 ? 쓸만 : 줄들).reduce<number | null>((큰, 줄) => (큰 === null || 줄.id > 큰 ? 줄.id : 큰), null);
}

async function 읽기(id: number): Promise<읽은것> {
  const [run, 결과] = await Promise.all([perfApi.runOf(id), perfApi.pages(id)]);
  return { run, ...결과 };
}

export function PerfPages({ service, run, 쓰나 }: { service: ServiceRow; run?: number; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [읽었나, set읽었나] = useState(false);
  const [읽은, set읽은] = useState<읽은것 | null>(null);
  const [고른, set고른] = useState<string | null>(null);
  const [목록, set목록] = useState<측정페이지[]>([]);
  const [출처, set출처] = useState<출처>('AI');
  const [env, setEnv] = useState(마지막서버(service.prefix, service.envs));
  const [기기, set기기] = useState<페이지기기>('desktop');
  const [망, set망] = useState<페이지망>('NONE');
  const [창, set창] = useState(false);
  const [하는중, set하는중] = useState(false);
  const [측정중, set측정중] = useState<number | null>(null);
  const [알림, set알림] = useState<string | null>(null);

  const 메인으로 = () => {
    set목록([{ url: '/', name: '메인', login: false }]);
    set출처('MANUAL');
  };
  const 추천 = usePerfJob<페이지추천>((결과) => {
    if (결과.pages.length === 0) return 메인으로();
    set목록(결과.pages.map(({ url, name, login }) => ({ url, name, login })));
  });

  function 보이기(받음: 읽은것) {
    set읽은(받음);
    set고른(처음고른(받음.pages));
  }

  // 처음 한 번 — 주소의 실행 → 없으면 가장 최근 측정 → 그것도 없으면 AI 추천 (키로 다시 그리므로 애플리케이션 · 실행이 바뀌면 처음부터다)
  useEffect(() => {
    let 살음 = true;
    void (async () => {
      try {
        const id = run ?? 가장최근번호((await perfApi.pagesRuns(service.id)).runs);
        if (id === null) {
          set읽었나(true);
          await perfApi.suggestPages(service.id, env === '' ? undefined : env).then(
            (받음) => 추천.맡기기(() => Promise.resolve(받음)),
            // 화면 기록이 없으면(409 NO_DATA) 추천을 못 받는다 — 메인 한 페이지로 시작한다
            () => 메인으로(),
          );
          return;
        }
        const 받음 = await 읽기(id);
        if (!살음) return;
        // 실행 기록에서 PAGE 가 아닌 번호가 넘어오면 그 실행의 화면으로 돌려보낸다
        if (받음.run.kind !== 'PAGE') return void window.location.replace(`#/perf/runs/${String(id)}`);
        보이기(받음);
        set목록(Array.isArray(받음.run.config.pages) ? 받음.run.config.pages : [{ url: '/', name: '메인', login: false }]);
        set기기(받음.run.config.device ?? 'desktop');
        set망(받음.run.config.network ?? 'NONE');
        if (service.envs.some((it) => it.env === 받음.run.env) && (run !== undefined || env === '')) setEnv(받음.run.env);
        if (도는중인가(받음.run.status)) set측정중(id);
      } catch (err) {
        if (살음) set알림(message(err, 언어));
      } finally {
        if (살음) set읽었나(true);
      }
    })();
    return () => {
      살음 = false;
    };
  }, []);

  // 추천이 실패해도 측정은 해야 한다 — 메인 한 페이지로 대신한다
  useEffect(() => {
    if (추천.오류 !== null) 메인으로();
  }, [추천.오류]);

  // 측정이 끝날 때까지 3초마다 그 실행만 가볍게 묻는다. 끝나면 표를 다시 읽는다
  useEffect(() => {
    if (측정중 === null) return;
    let 살음 = true;
    void (async () => {
      try {
        for (;;) {
          await new Promise((풀기) => setTimeout(풀기, 묻는간격.ms));
          if (!살음) return;
          const 상세 = await perfApi.runOf(측정중);
          if (!살음) return;
          if (도는중인가(상세.status)) continue;
          if (상세.status === 'ERROR') {
            const 까닭 = (await perfApi.events(측정중)).events.filter((줄) => /warn/i.test(줄.level)).at(-1)?.message;
            if (살음) set알림(까닭 === undefined ? t('측정이 오류로 끝났습니다') : t('측정이 오류로 끝났습니다 — {까닭}', { 까닭 }));
          } else {
            const 받음 = await 읽기(측정중);
            if (살음) 보이기(받음);
          }
          if (살음) set측정중(null);
          return;
        }
      } catch (err) {
        if (!살음) return;
        set알림(message(err, 언어));
        set측정중(null);
      }
    })();
    return () => {
      살음 = false;
    };
  }, [측정중]);

  async function 측정() {
    if (env === '') return set알림(t('대상 서버를 골라 주세요'));
    set하는중(true);
    set알림(null);
    try {
      const { runId } = await perfApi.measure({ serviceId: service.id, env, pages: 목록, device: 기기, network: 망 });
      고른서버를적는다(service.prefix, env);
      set측정중(runId);
    } catch (err) {
      set알림(message(err, 언어));
    } finally {
      set하는중(false);
    }
  }

  const 재는중 = 하는중 || 측정중 !== null;
  const 고른줄 = 읽은?.pages.find((줄) => 줄.url === 고른);
  const 시각 = 읽은 === null ? null : (읽은.run.startedAt ?? 읽은.run.createdAt);
  const 칸 = <T extends string>(이름: string, 값: T, 보기: [T, string][], 고침: (값: T) => void) => (
    <div className="perf-field">
      <span>{t(이름)}</span>
      <div className="pp-seg" role="radiogroup" aria-label={t(이름)}>
        {보기.map(([v, 글]) => (
          <label key={v} className={v === 값 ? 'on' : undefined}>
            <input type="radio" name={이름} checked={v === 값} disabled={!쓰나} onChange={() => 고침(v)} />
            {t(글)}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Head
        위치={t('성능 테스트')}
        제목={t('페이지 성능')}
        부제={시각 === null ? t('아직 측정한 적이 없습니다 · 페이지별 3회 측정 중앙값') : t('최근 측정 {시각} · 페이지별 3회 측정 중앙값', { 시각: 시각글(시각, 언어) })}
        행동={
          쓰나 ? (
            <button type="button" className="btn" disabled={재는중 || 목록.length === 0} onClick={() => void 측정()}>
              {재는중 ? t('측정 중') : t('측정')}
            </button>
          ) : null
        }
      />
      <div className="screen perf-run">
        {알림 === null ? null : (
          <p className="perf-err" role="alert">
            {알림}
          </p>
        )}
        <section className="perf-panel" aria-label={t('측정 조건')}>
          <div className="perf-fields">
            <label className="perf-field">
              {t('대상 서버')}
              <select value={env} disabled={!쓰나} onChange={(e) => setEnv(e.target.value)}>
                <option value="">{t('고르기')}</option>
                {service.envs.map((it) => (
                  <option key={it.env} value={it.env}>
                    {it.env}
                  </option>
                ))}
              </select>
            </label>
            {칸('디바이스', 기기, [['desktop', 'PC'], ['mobile', '모바일']], set기기)}
            {칸('네트워크', 망, [['NONE', '제한 없음'], ['SLOW_4G', 'Slow 4G']], set망)}
          </div>
          <div className="perf-row">
            {출처 === 'AI' ? <span className="perf-ai">AI</span> : null}
            <span>
              {추천.도나
                ? t('AI 가 측정할 페이지를 고르는 중입니다')
                : 출처 === 'AI'
                  ? t('측정 대상: 화면 지도 기준 주요 페이지 {수}개', { 수: 목록.length })
                  : t('측정 대상: 페이지 {수}개', { 수: 목록.length })}
            </span>
            {쓰나 ? (
              <button type="button" className="btn ghost" disabled={추천.도나 || 목록.length === 0} onClick={() => set창(true)}>
                {t('페이지 선택')}
              </button>
            ) : null}
          </div>
        </section>

        {!읽었나 ? (
          <Loading />
        ) : 읽은 === null || 읽은.pages.length === 0 ? (
          <div className="empty">{t('아직 측정 결과가 없습니다. 측정을 누르면 페이지마다 속도를 잽니다')}</div>
        ) : (
          <>
            <PerfPagesTiles 줄들={읽은.pages} />
            <PerfPagesTable 줄들={읽은.pages} 비교={읽은.compare} 고른={고른} on고름={set고른} />
            {고른줄 === undefined ? null : <PerfPagesWaterfall 줄={고른줄} />}
          </>
        )}
      </div>
      {!창 ? null : (
        <PerfPagesPick
          목록={목록}
          닫기={() => set창(false)}
          적용={(고름) => {
            set목록(고름);
            set출처('MANUAL');
            set창(false);
          }}
        />
      )}
    </>
  );
}
