// 테스트 모드의 오른쪽 실시간 칸 — 브라우저 · 폰 장면을 되풀이해 받아 그리고, 폰을 잡으면 Device VISION 링크를 띄운다 (도메인/실행 §3.2 「테스트 모드」 · 시안 A)

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { use말 } from './i18n.js';

export type 장면답 = { 종류: 'frame'; 그림: Blob } | { 종류: 'empty' } | { 종류: 'gone' } | { 종류: 'unreachable' };

/** 검사가 바꿔 끼우게 객체에 둔다 */
export const 장면통로 = {
  async 받기(주소: string): Promise<장면답> {
    try {
      const res = await fetch(주소, { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 200) return { 종류: 'frame', 그림: await res.blob() };
      // 자리를 기다리는 중이거나 폰을 여는 중이라 아직 장면이 없다
      if (res.status === 204) return { 종류: 'empty' };
      // 404 는 끝난 시험이라 러너가 장면을 버렸다. 401 · 403 은 다시 물어도 같은 답이고, 로그인으로 보내는 일은 같이 도는 결과 묻기(call)가 한다
      if (res.status === 404 || res.status === 401 || res.status === 403) return { 종류: 'gone' };
      // 502(admin 이 러너에 못 닿음)와 그 밖의 서버 오류는 한때일 수 있다. 기다림으로 가리지 않고 알리되 다시 묻는다 (도메인/실행 §7 「테스트 모드 통로」)
      return { 종류: 'unreachable' };
    } catch {
      return { 종류: 'unreachable' };
    }
  },
};

const 묻는간격 = 250;
// 앱 · 게임 폰 장면은 1초에 한 장쯤이다 — PNG 라 커서 같은 그림을 0.25초마다 받지 않는다
const 폰묻는간격 = 1000;
// 못 닿는 동안은 천천히 묻는다 — 꺼진 러너에 칸마다 1초에 네 번씩 두드리지 않게
const 못닿을때간격 = 2000;

export function use장면(주소: string | null, 도는중: boolean, 앱폰: boolean) {
  const [그림, set그림] = useState<string | null>(null);
  // 마지막 그림이 Appium 폰 장면(PNG)인가 — 섞인 E2E 의 앱 · 게임 단계도 폰 칸 이름과 1초 간격을 쓴다
  const [폰그림, set폰그림] = useState(false);
  // 마지막 답이 「장면 없음」이었나 — E2E 는 앱 · 게임 단계를 열고 폰 장면이 오기 전까지 장면이 없다
  const [비었나, set비었나] = useState(false);
  const [못닿음, set못닿음] = useState(false);
  const 지금그림 = useRef<string | null>(null);

  // 칸이 내려가면 마지막 그림을 놓는다. 안 놓으면 장면마다 쌓인다
  useEffect(
    () => () => {
      if (지금그림.current !== null) URL.revokeObjectURL(지금그림.current);
    },
    [],
  );

  useEffect(() => {
    if (주소 === null || !도는중) return;
    let 멈춤 = false;
    let 타이머: ReturnType<typeof setTimeout> | undefined;
    let 폰장 = 앱폰;
    // 앞 물음이 끝나야 다음을 묻는다 — 느린 망에서 물음이 겹쳐 쌓이지 않게
    const 받기 = async () => {
      const 답 = await 장면통로.받기(주소);
      if (멈춤) return;
      set못닿음(답.종류 === 'unreachable');
      if (답.종류 === 'gone') return;
      if (답.종류 === 'frame') {
        const 새 = URL.createObjectURL(답.그림);
        if (지금그림.current !== null) URL.revokeObjectURL(지금그림.current);
        지금그림.current = 새;
        set그림(새);
        폰장 = 앱폰 || 답.그림.type === 'image/png';
        set폰그림(폰장);
      }
      if (답.종류 !== 'unreachable') set비었나(답.종류 === 'empty');
      타이머 = setTimeout(() => void 받기(), 답.종류 === 'unreachable' ? 못닿을때간격 : 폰장 ? 폰묻는간격 : 묻는간격);
    };
    void 받기();
    return () => {
      멈춤 = true;
      clearTimeout(타이머);
    };
  }, [주소, 도는중, 앱폰]);

  return { 그림, 폰그림, 비었나, 못닿음: 못닿음 && 도는중 };
}

interface Props {
  /** 장면 통로 주소. 시작 응답 전이면 null */
  주소: string | null;
  도는중: boolean;
  /** VISION 이 폰을 잡은 동안 그 폰 화면 주소. 서버가 http(s) 만 싣는다 */
  vision: string | null;
  /** 칸 머리 둘째 글. 없으면 「서버 브라우저」(폰 장면이면 「Device VISION 폰」) — 실행 창은 몇째 케이스인지 적는다 */
  부제?: string;
  /**
   * Android 앱 · 게임 케이스 — 러너가 Appium 으로 1초쯤마다 찍은 폰 화면이 온다(러너 §5.2 「테스트 모드 — 실시간 장면」).
   * 시나리오에는 안 쓴다 — Android 시나리오에도 PC 로 도는 웹 단계가 낄 수 있다
   */
  폰만?: boolean;
  /**
   * 모바일 웹 케이스 · 시나리오. VISION 이 폰을 잡으면 실제 폰 Chrome 탭의 장면이 온다 — 그때부터 칸 이름이 폰 화면이다.
   * 폰을 잡기 전에는 팜 없는 서버의 흉내일 수도 있어 브라우저 장면을 기다린다
   */
  모바일웹?: boolean;
  /** 「동작마다 1초 천천히」를 칸 아래에 둔다. 실행 창은 띠 오른쪽에 적어서 끈다 (도메인/실행 §8.16 ③) */
  늦춤글?: boolean;
  /** 첫 장면 전 브라우저 칸에 「브라우저를 여는 중」 뼈대를 그린다 — 자식 Playwright 가 브라우저를 여는 4~5초가 빈 칸이었다 (§8.16 ③ · 점검표 B1) */
  뼈대?: boolean;
  /** VISION 이 잡은 폰의 모델 이름. 팜이 안 주면 없다 — 있으면 칸 머리에 적는다 (E2E 실행 창) */
  폰이름?: string | null;
  /** 칸 머리 맨 끝에 더할 것 — E2E 실행 창의 「크게 보기」 */
  머리끝?: ReactNode;
}

/** 시작한 테스트 모드 하나의 칸. 끝나도 마지막 장면을 그대로 둔다. 장면 없이 끝났으면 칸을 그리지 않는다 */
export function 장면칸({ 주소, 도는중, vision, 부제, 폰만: 앱폰 = false, 모바일웹 = false, 늦춤글 = true, 뼈대 = false, 폰이름 = null, 머리끝 }: Props) {
  const t = use말();
  const 실제폰웹 = 모바일웹 && vision !== null;
  const { 그림, 폰그림, 비었나, 못닿음 } = use장면(주소, 도는중, 앱폰);
  const 폰칸 = 앱폰 || 실제폰웹 || 폰그림;
  if (!도는중 && 그림 === null) return null;
  // 섞인 E2E 의 앱 단계를 열고 첫 폰 장면이 오기 전 — 마지막 웹 장면을 흐리게 둔다. E2E 는 창 하나라 웹 장면이 한 번 온 뒤의 「장면 없음」은 폰 단계뿐이다.
  // 폰은 시나리오 내내 잡혀 있어 장면이 오기 전에는 폰 단계인지 첫 웹 단계를 기다리는 중인지 모른다
  const 폰단계 = 도는중 && !폰칸 && 비었나 && vision !== null && 그림 !== null;

  return (
    <section className="trial-live" aria-label={t('실시간 화면')}>
      <div className="live-head">
        {도는중 ? <span className="pulse" aria-hidden="true" /> : null}
        <b>{!도는중 ? t('마지막 화면') : 폰칸 ? t('디바이스 화면') : t('실시간 화면')}</b>
        <span className="live-sub">{부제 ?? (실제폰웹 ? t('실제 디바이스 Chrome') : 폰그림 ? t('Device VISION 디바이스') : t('서버 브라우저'))}</span>
        {폰이름 === null || vision === null ? null : <span className="live-phone">{폰이름}</span>}
        {vision === null ? null : (
          <a className="btn small ghost live-vision" href={vision} target="_blank" rel="noreferrer">
            {t('Device VISION 에서 보기 ↗')}
          </a>
        )}
        {머리끝}
      </div>
      {그림 === null && 뼈대 && !폰칸 && vision === null ? (
        <div className="live-wait live-skel" aria-busy="true">
          <span className="skel-bar" aria-hidden="true" />
          <span className="skel-bar short" aria-hidden="true" />
          <span className="skel-box" aria-hidden="true" />
          <p>{t('브라우저를 여는 중')}</p>
        </div>
      ) : 그림 === null ? (
        <p className="live-wait">
          {앱폰 && vision === null
            ? t('사용할 디바이스를 찾는 중')
            : 폰칸
              ? t('디바이스 화면을 기다리고 있습니다')
              : vision !== null
                ? t('화면을 기다리고 있습니다')
                : t('차례를 기다리는 중')}
        </p>
      ) : (
        <div className={폰단계 ? 'live-shot dim' : 'live-shot'}>
          <img src={그림} alt={!도는중 ? t('끝난 순간의 화면') : 폰칸 ? t('디바이스의 지금 화면') : t('서버 브라우저의 지금 화면')} />
          {폰단계 ? <p className="live-over">{t('지금은 앱 단계라 디바이스에서 실행 중입니다')}</p> : null}
        </div>
      )}
      {못닿음 ? (
        <p className="live-note bad">{t('실행 서버와 연결이 끊겼습니다. 다시 연결하는 중입니다')}</p>
      ) : 늦춤글 && 도는중 && (!폰칸 || 실제폰웹) ? (
        // 실제 폰도 늦춘다. 앱 · 게임은 Appium 이라 안 늦춘다 (러너 §5.2)
        <p className="live-note">{t('동작마다 1초 천천히')}</p>
      ) : null}
    </section>
  );
}
