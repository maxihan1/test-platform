// 실패 카드 디바이스 칸의 시간축 증거 — 단계 띠 · 단계 목록 · 종류별 증거 칸이 고른 단계 하나를 같이 본다 (WEB-F7-13 · 시안 11판 「실행 결과」)

import { useEffect, useRef, useState } from 'react';

import { GAME_TREE_FILE } from '@platform/kit/protocol';

import { api, type FailureDevice, type ItemTrace, type RunItemDetail, type RunItemPage, type StepResult } from './api.js';
import { 팜영상인가, 팜증적 } from './FarmEvidence.js';
import { use말, use언어 } from './i18n.js';
import { show, Step } from './ItemSteps.js';
import { 기록없음, 네트워크표, 콘솔표 } from './ItemTrace.js';
import { FPS선, 게임오브젝트, 기기정보, 네트워크눈금 } from './RunEvidenceParts.js';
import { type Async, Failed, Loading, PLATFORM_LABEL, seconds, useAsync } from './ui.js';

export type 증거종류 = 'web' | 'app' | 'api';
type 탭 = 'shot' | 'obj' | 'net' | 'con' | 'log' | 'video' | 'dev' | 'req' | 'res' | 'diff';

/**
 * 애플리케이션 종류를 따로 받지 않고 항목으로 가른다 — API 케이스만 절차에 요청 · 응답 원문을 남긴다.
 * android 를 먼저 본다 — 게임 데이터 대조 케이스도 단계에서 서버 API 를 불러 요청 원문이 남는다. API 케이스는 늘 desktop 이다(도메인/API K8)
 */
export function 증거종류(item: RunItemDetail): 증거종류 {
  if (item.platform === 'android') return 'app';
  return item.steps.some((s) => s.httpTrace !== undefined) ? 'api' : 'web';
}

/** 처음엔 처음 깨진 단계를 고른다 — 실패 시점 화면 · 기대값 차이가 거기 있다 */
const 첫고름 = (steps: StepResult[]): number | null => (steps.find((s) => s.status === 'FAIL') ?? steps.at(-1))?.seq ?? null;

/** @param devices 같은 실패로 묶인 디바이스들 — 단계는 첫 디바이스 것을 한 번 그리고 화면 · logcat 은 디바이스마다 나란히 둔다 */
export function 시간축증거({ devices }: { devices: FailureDevice[] }) {
  const t = use말();
  const 언어 = use언어();
  const 대표 = devices[0]!.item;
  const [고른, set고른] = useState(() => 첫고름(대표.steps));
  // 고를 때마다 늘려 그 단계 줄을 새로 그린다 — 실패 확인 줄 깜박임이 다시 돈다(DESIGN 원칙 4 「증거 바꾸기」)
  const [깜박, set깜박] = useState(0);
  const 웹 = 증거종류(대표) === 'web';
  const 뿌리 = useRef<HTMLDivElement>(null);
  // 항목 상세는 네트워크 눈금과 네트워크 · 콘솔 탭이 같이 쓴다. 카드를 펼칠 때 한 번 읽는다 — 접힌 카드까지 미리 읽으면 쪽 하나에 스무 번 부른다
  const [읽음, set읽음] = useState(false);
  const 상세 = useAsync(() => (읽음 ? api.item(대표.runId, 대표.historyId) : Promise.resolve(null)), [읽음, 대표.runId, 대표.historyId]);
  useEffect(() => {
    const 접이 = 뿌리.current?.closest('details');
    if (!웹 || 접이 == null) return;
    const 펼침 = (): void => {
      if (접이.open) set읽음(true);
    };
    펼침();
    접이.addEventListener('toggle', 펼침);
    return () => 접이.removeEventListener('toggle', 펼침);
  }, [웹]);

  if (대표.steps.length === 0 || 고른 === null) return <span className="fc-faint">{t('실행된 절차가 없습니다.')}</span>;

  const 전체ms = 대표.steps.reduce((합, s) => 합 + s.durationMs, 0);
  const 고르기 = (seq: number): void => {
    set고른(seq);
    set깜박((n) => n + 1);
  };
  // 짧은 단계도 누를 자리는 남긴다 — 눈금 줄도 같은 폭을 받아 단계 칸과 줄이 맞는다
  const 폭 = (s: StepResult): number => Math.max(전체ms === 0 ? 1 : (s.durationMs / 전체ms) * 100, 2);
  // 단추를 다시 그리면 포커스가 빠진다 — 이름이 다른 같은 깜박임 둘을 번갈아 걸어 다시 돌린다
  const 깜박이 = 깜박 === 0 ? '' : 깜박 % 2 === 1 ? ' flash-a' : ' flash-b';
  const 기록 = 상세.data?.trace ?? null;

  return (
    <div className="ev" ref={뿌리}>
      <div className="ev-tl">
        <div className="ev-tl-h">
          <span>{t('시간축 · 단계를 누르면 증거 칸이 그 단계로 바뀝니다')}</span>
          <span className="mono">{seconds(전체ms, 언어)}</span>
        </div>
        <div className="ev-track" role="group" aria-label={t('단계 고르기')}>
          {대표.steps.map((s) => (
            <button
              key={s.seq}
              type="button"
              className={(s.status === 'FAIL' ? 'ev-seg bad' : 'ev-seg') + (s.seq === 고른 ? 깜박이 : '')}
              style={{ flex: 폭(s) }}
              aria-pressed={s.seq === 고른}
              aria-label={t('{번호}단계 {제목}', { 번호: s.seq, 제목: s.title })}
              title={`${String(s.seq)} ${s.title}`}
              onClick={() => 고르기(s.seq)}
            >
              {s.seq} {s.title}
            </button>
          ))}
        </div>
        {웹 ? <네트워크눈금 steps={대표.steps} trace={기록} 폭={폭} /> : null}
        {/* 단계를 한 번 그리듯 선도 첫 디바이스 것 하나다 */}
        <FPS선 steps={대표.steps} fps={devices[0]!.fps ?? []} 폭={폭} />
      </div>

      <div className="ev-grid">
        <ol className="ev-steps">
          {대표.steps.map((s) => (
            // 줄 어디를 눌러도 고른다 — 키보드는 위 띠의 단추로 고른다
            <li
              key={s.seq === 고른 ? `${String(s.seq)}-${String(깜박)}` : s.seq}
              className={s.seq !== 고른 ? undefined : 깜박 > 0 ? 'on flash' : 'on'}
              onClick={() => 고르기(s.seq)}
            >
              <Step step={s} tcId={대표.tcId} runId={대표.runId} historyId={대표.historyId} 코드={false} 화면={false} />
            </li>
          ))}
        </ol>
        <증거칸 devices={devices} seq={고른} 상세={상세} 읽기={() => set읽음(true)} />
      </div>
    </div>
  );
}

function 증거칸({ devices, seq, 상세, 읽기 }: { devices: FailureDevice[]; seq: number; 상세: Async<RunItemPage | null>; 읽기: () => void }) {
  const t = use말();
  const 대표 = devices[0]!.item;
  const 종류 = 증거종류(대표);
  const 묶임 = devices.length > 1;
  // 오브젝트 목록 파일은 「오브젝트」 탭이 펼쳐 보여 「받기」 줄에서 뺀다
  const 받기파일 = (d: FailureDevice) => d.farm.filter((f) => f.name !== GAME_TREE_FILE);
  const 목록있음 = (d: FailureDevice): boolean => d.farm.some((f) => f.name === GAME_TREE_FILE);
  const 팜 = devices.flatMap(받기파일);
  const 탭들: { id: 탭; 이름: string }[] =
    종류 === 'api'
      ? [
          { id: 'req', 이름: t('요청') },
          { id: 'res', 이름: t('응답') },
          { id: 'diff', 이름: t('기대값 차이') },
        ]
      : 종류 === 'app'
        ? [
            { id: 'shot', 이름: t('화면') },
            // 게임 항목만 — 데이터 대조를 했거나 통과 못 해 오브젝트 목록이 남았을 때
            ...(devices.some((d) => (d.elementChecks?.length ?? 0) > 0 || 목록있음(d)) ? [{ id: 'obj' as const, 이름: t('오브젝트') }] : []),
            // 팜이 받아 둔 것만 탭이 선다 — 팜 기능 전 항목은 화면 하나다
            ...(팜.some((f) => !팜영상인가(f)) ? [{ id: 'log' as const, 이름: 'logcat' }] : []),
            ...(팜.some(팜영상인가) ? [{ id: 'video' as const, 이름: t('화면 영상') }] : []),
            // 폰 연결이 열려 판을 읽은 항목만 — 이 칸 전 기록에는 없다
            ...(devices.some((d) => d.device != null) ? [{ id: 'dev' as const, 이름: t('기기 정보') }] : []),
          ]
        : [
            { id: 'shot', 이름: t('화면') },
            { id: 'net', 이름: t('네트워크') },
            { id: 'con', 이름: t('콘솔') },
          ];
  const [탭, set탭] = useState<탭>(탭들[0]!.id);
  const 단계 = (d: FailureDevice): StepResult | undefined => d.item.steps.find((s) => s.seq === seq);

  let 본문;
  if (탭 === 'shot') {
    const 사진들 = devices.flatMap((d) => {
      const s = 단계(d);
      return s?.screenshotPath === undefined ? [] : [{ d, s }];
    });
    본문 =
      사진들.length === 0 ? (
        <p className="fc-faint">{t('이 단계에서 찍은 화면이 없습니다')}</p>
      ) : (
        사진들.map(({ d, s }) => (
          <figure key={d.platform} className="ev-shot">
            <a href={api.screenshot(d.item.runId, d.item.historyId, s.seq)} target="_blank" rel="noreferrer">
              <img
                src={api.screenshot(d.item.runId, d.item.historyId, s.seq)}
                // capture:true 로 찍은 통과 단계 화면을 「실패 시점 화면」이라 부르지 않는다 (실행 §8.3)
                alt={t(
                  s.status === 'FAIL'
                    ? 묶임 ? '{디바이스} {절차} 실패 시점 화면' : '{절차} 실패 시점 화면'
                    : 묶임 ? '{디바이스} {절차} 화면' : '{절차} 화면',
                  { 디바이스: PLATFORM_LABEL[d.platform], 절차: s.title },
                )}
                loading="lazy"
              />
            </a>
            <figcaption>
              {[묶임 ? PLATFORM_LABEL[d.platform] : null, t('{번호}단계', { 번호: s.seq }), s.status === 'FAIL' ? t('실패 시점') : null]
                .filter((x) => x !== null)
                .join(' · ')}
            </figcaption>
          </figure>
        ))
      );
  } else if (탭 === 'net' || 탭 === 'con') {
    본문 =
      상세.error !== null ? (
        <Failed error={상세.error} />
      ) : 상세.data === null ? (
        <Loading />
      ) : (
        <단계기록 trace={상세.data.trace} seq={seq} 탭={탭} 앞말={묶임 ? PLATFORM_LABEL[대표.platform] : null} />
      );
  } else if (탭 === 'log' || 탭 === 'video') {
    본문 = (
      <>
        <p className="hint">{t('실행 전체의 기록입니다 — 단계를 바꿔도 같습니다')}</p>
        {devices.map((d) => (
          <div key={d.platform}>
            {묶임 ? <b>{PLATFORM_LABEL[d.platform]}</b> : null}
            <팜증적 주소={(name) => api.farmFile(d.item.runId, d.item.historyId, name)} files={받기파일(d)} 보일={탭} />
          </div>
        ))}
      </>
    );
  } else if (탭 === 'obj') {
    본문 = (
      <>
        <p className="hint">{t('항목 전체의 기록입니다 — 단계를 바꿔도 같습니다')}</p>
        {devices.map((d) => (
          <게임오브젝트
            key={d.platform}
            대조={d.elementChecks ?? []}
            목록주소={목록있음(d) ? api.farmFile(d.item.runId, d.item.historyId, GAME_TREE_FILE) : null}
            이름={묶임 ? PLATFORM_LABEL[d.platform] : null}
          />
        ))}
      </>
    );
  } else if (탭 === 'dev') {
    본문 = devices.map((d) => <기기정보 key={d.platform} device={d.device ?? null} 이름={묶임 ? PLATFORM_LABEL[d.platform] : null} />);
  } else {
    본문 = <API증거 step={단계(devices[0]!)} 탭={탭} />;
  }

  return (
    <div className="ev-view">
      <div className="trace-tabs" role="tablist" aria-label={t('증거 종류')}>
        {탭들.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={탭 === x.id}
            className="trace-tab"
            onClick={() => {
              set탭(x.id);
              // 네트워크 · 콘솔은 실패 카드 통로에 없다 — 펼치지 않은 채 탭을 누르면 여기서 읽는다
              if (x.id === 'net' || x.id === 'con') 읽기();
            }}
          >
            {x.이름}
          </button>
        ))}
      </div>
      {/* 탭 · 단계가 바뀌면 새로 그려 겹쳐 바뀐다(DESIGN 원칙 4 「증거 바꾸기」) */}
      <div key={`${탭}-${String(seq)}`} className="ev-pane" role="tabpanel">
        {본문}
      </div>
    </div>
  );
}

/** 고른 단계의 줄만 — 준비 · 정리(seq 없음) 줄은 「상세」에서 본다 */
function 단계기록({ trace, seq, 탭, 앞말 }: { trace: ItemTrace | null; seq: number; 탭: 'net' | 'con'; 앞말: string | null }) {
  const t = use말();
  if (trace === null || trace.status !== 'DONE') return <기록없음 trace={trace} />;
  const 전체 = 탭 === 'net' ? trace.network.length : trace.console.length;
  const 안내 = t('{번호}단계 것만 보입니다 · 전체 {건수}건은 「상세」에서 봅니다', { 번호: seq, 건수: 전체 });
  return (
    <>
      <p className="hint">{앞말 === null ? 안내 : `${앞말} · ${안내}`}</p>
      {탭 === 'net' ? (
        <네트워크표 key={seq} 줄들={trace.network.filter((n) => n.seq === seq)} />
      ) : (
        <콘솔표 줄들={trace.console.filter((c) => c.seq === seq)} />
      )}
    </>
  );
}

function API증거({ step, 탭 }: { step: StepResult | undefined; 탭: 'req' | 'res' | 'diff' }) {
  const t = use말();
  const 언어 = use언어();
  if (탭 !== 'diff') {
    const 원문 = step?.httpTrace === undefined ? undefined : 탭 === 'req' ? step.httpTrace.request : step.httpTrace.response;
    return 원문 === undefined ? <p className="fc-faint">{t('이 단계는 API 를 부르지 않았습니다')}</p> : <pre className="ev-json">{JSON.stringify(원문, null, 2)}</pre>;
  }
  const 다른것 = step?.assertions.filter((a) => a.status === 'FAIL') ?? [];
  if (다른것.length === 0) return <p className="fc-faint">{t('이 단계는 기대값과 다른 곳이 없습니다')}</p>;
  return (
    <table className="trace-table">
      <thead>
        <tr>
          <th>{t('확인')}</th>
          <th>{t('기대')}</th>
          <th>{t('실제')}</th>
        </tr>
      </thead>
      <tbody>
        {다른것.map((a, i) => (
          <tr key={i} className="bad">
            <td>{a.statement}</td>
            <td className="trace-m">{show(a.expected, 언어)}</td>
            <td className="trace-m">{show(a.actual, 언어)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
