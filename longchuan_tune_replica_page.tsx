import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "tone" | "melody";
type Screen = "home" | "toneTraining" | "melodyTraining";
type PlaybackState = "idle" | "playing";
type RecordingState = "recording" | "stopped";
type IconProps = { size?: number; strokeWidth?: number; className?: string };
type ToneLine = { lyric: string; guide: string; contour: string; focus: "声调" };
type MelodyLine = { lyric: string; notation: string; rhythm: string; focus: "旋律" };

const DESIGN_WIDTH = 1536;
const DESIGN_HEIGHT = 1152;
const TRAINING_TOTAL_SECONDS = 25 * 60;
const AVATAR_LEVEL_LABEL = "Lv.6";
const iconColor = "currentColor";

const modes: Mode[] = ["tone", "melody"];
const screens: Screen[] = ["home", "toneTraining", "melodyTraining"];
const playbackStates: PlaybackState[] = ["idle", "playing"];
const recordingStates: RecordingState[] = ["recording", "stopped"];

const tonePracticeLyrics: ToneLine[] = [
  { lyric: "正月里是新年哪", guide: "zheng yue li shi xin nian na", contour: "平稳起声，尾音轻收", focus: "声调" },
  { lyric: "妹娃儿去拜年哪", guide: "mei wa er qu bai nian na", contour: "二声上扬，四声落稳", focus: "声调" },
  { lyric: "金哪银儿梭", guide: "jin na yin er suo", contour: "短句连贯，口型圆润", focus: "声调" },
  { lyric: "阳雀叫啊捎着莺鸽", guide: "yang que jiao a shao zhe ying ge", contour: "高处放松，低处不断气", focus: "声调" },
  { lyric: "妹娃要过河", guide: "mei wa yao guo he", contour: "重音在“过”，收尾在“河”", focus: "声调" },
  { lyric: "艄公你把舵稳着", guide: "shao gong ni ba duo wen zhe", contour: "句尾保持，不要下坠", focus: "声调" },
  { lyric: "慢慢儿把船划过河", guide: "man man er ba chuan hua guo he", contour: "慢起慢落，气息托住", focus: "声调" },
];

const melodyPracticeLyrics: MelodyLine[] = [
  { lyric: "正月里是新年哪", notation: "5 6 1′ 6 5 3 2", rhythm: "♩ ♩ ♪♪ ♩ ♩ ♩ ♩", focus: "旋律" },
  { lyric: "妹娃儿去拜年哪", notation: "3 5 6 5 3 2 1", rhythm: "♩ ♪♪ ♩ ♩ ♪♪ ♩", focus: "旋律" },
  { lyric: "金哪银儿梭", notation: "1 2 3 5 3", rhythm: "♩ ♩ ♩ ♪♪ ♩", focus: "旋律" },
  { lyric: "阳雀叫啊捎着莺鸽", notation: "5 6 1′ 2′ 1′ 6 5 3", rhythm: "♪♪ ♪♪ ♩ ♩ ♪♪ ♩", focus: "旋律" },
  { lyric: "妹娃要过河", notation: "3 5 6 5 2", rhythm: "♩ ♩ ♪♪ ♩ ♩", focus: "旋律" },
  { lyric: "艄公你把舵稳着", notation: "2 3 5 6 5 3 2", rhythm: "♪♪ ♩ ♩ ♩ ♪♪ ♩", focus: "旋律" },
  { lyric: "慢慢儿把船划过河", notation: "1 2 3 5 6 5 3 1", rhythm: "♩ ♪♪ ♩ ♪♪ ♩ ♩", focus: "旋律" },
];

function computeResponsiveScale(width: number, height: number) {
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT, 1);
}

function formatTrainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getTrainingScreen(mode: Mode): Screen {
  return mode === "tone" ? "toneTraining" : "melodyTraining";
}

function getModeFromScreen(screen: Screen, fallback: Mode): Mode {
  if (screen === "toneTraining") return "tone";
  if (screen === "melodyTraining") return "melody";
  return fallback;
}

function getTrainingTitle(mode: Mode) {
  return mode === "tone" ? "声调训练" : "旋律训练";
}

function getTrainingSubtitle(mode: Mode) {
  return mode === "tone" ? "看升降与轻重" : "看音高与节拍";
}

function getTrainingDescription(mode: Mode) {
  return mode === "tone"
    ? "看歌词练声调：重点听高低、升降、轻重与句尾收束。"
    : "看歌词练旋律：重点跟音高走向、节拍长度与旋律连贯。";
}

function getLyricCount(mode: Mode) {
  return mode === "tone" ? tonePracticeLyrics.length : melodyPracticeLyrics.length;
}

function getNextLyricIndex(current: number, total: number) {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

function getCircularItem<T>(items: T[], index: number, fallback: T): T {
  if (items.length === 0) return fallback;
  const safeIndex = ((index % items.length) + items.length) % items.length;
  return items[safeIndex];
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

function Icon({ size = 24, className = "", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function ChevronLeftIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M15 18L9 12L15 6" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function SettingsIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="3.2" stroke={iconColor} strokeWidth={strokeWidth} />
      <path d="M19.4 13.5c.08-.48.1-.99.1-1.5s-.02-1.02-.1-1.5l2-1.55l-2-3.46l-2.38.96a8 8 0 0 0-2.6-1.5L14.05 2h-4.1l-.37 2.95a8 8 0 0 0-2.6 1.5L4.6 5.49l-2 3.46l2 1.55c-.08.48-.1.99-.1 1.5s.02 1.02.1 1.5l-2 1.55l2 3.46l2.38-.96a8 8 0 0 0 2.6 1.5l.37 2.95h4.1l.37-2.95a8 8 0 0 0 2.6-1.5l2.38.96l2-3.46l-2-1.55Z" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function CircleHelpIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="9" stroke={iconColor} strokeWidth={strokeWidth} />
      <path d="M9.7 9.1A2.4 2.4 0 0 1 12.05 7c1.43 0 2.45.85 2.45 2.08c0 1.1-.67 1.65-1.56 2.22c-.74.48-.94.86-.94 1.7" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M12 17h.01" stroke={iconColor} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
    </Icon>
  );
}

function RotateCcwIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M3 9V4h5" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.7 9.8A8.4 8.4 0 1 0 6.1 6.1L3 9" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function PlayIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M8 5.5v13l10-6.5L8 5.5Z" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

function PauseIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M8.5 6v12M15.5 6v12" stroke={iconColor} strokeWidth={strokeWidth + 1} strokeLinecap="round" />
    </Icon>
  );
}

function DiscIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <circle cx="12" cy="12" r="9" stroke={iconColor} strokeWidth={strokeWidth} />
      <circle cx="12" cy="12" r="3.5" stroke={iconColor} strokeWidth={strokeWidth} />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Icon>
  );
}

function GamepadIcon({ size = 24, strokeWidth = 2, className = "" }: IconProps) {
  return (
    <Icon size={size} className={className}>
      <path d="M7.2 9h9.6c2.1 0 3.1 1.35 3.45 3.35l.55 3.1c.22 1.28-.6 2.55-1.9 2.55c-.7 0-1.15-.28-1.72-.86L15.7 15.7H8.3l-1.48 1.44c-.57.58-1.02.86-1.72.86c-1.3 0-2.12-1.27-1.9-2.55l.55-3.1C4.1 10.35 5.1 9 7.2 9Z" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12v2M7 13h2M16.5 12.6h.01M18.2 14h.01" stroke={iconColor} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Icon>
  );
}

function runSmokeTests() {
  const components = [ChevronLeftIcon, SettingsIcon, CircleHelpIcon, RotateCcwIcon, PlayIcon, PauseIcon, DiscIcon, GamepadIcon];
  console.assert(components.length === 8, "Expected all inline icon components to be present.");
  console.assert(typeof LongchuanTuneReplica === "function", "Main page component should be a function component.");
  console.assert(modes.includes("tone") && modes.includes("melody"), "Training mode switch should support tone and melody.");
  console.assert(playbackStates.includes("idle") && playbackStates.includes("playing"), "Playback should support idle and playing states.");
  console.assert(recordingStates.includes("recording") && recordingStates.includes("stopped"), "Recording should support recording and stopped states.");
  console.assert(computeResponsiveScale(1536, 1152) === 1, "Reference canvas should render at 1x scale.");
  console.assert(computeResponsiveScale(768, 576) === 0.5, "Canvas should scale down proportionally on smaller screens.");
  console.assert(formatTrainingTime(0) === "0:00", "Elapsed time should start at 0:00.");
  console.assert(formatTrainingTime(750) === "12:30", "750 elapsed seconds should equal 12:30.");
  console.assert(formatTrainingTime(TRAINING_TOTAL_SECONDS) === "25:00", "Full training duration should equal 25:00.");
  console.assert(AVATAR_LEVEL_LABEL === "Lv.6", "Avatar level badge should render the full level label.");
  console.assert(screens.includes("home") && screens.includes("toneTraining") && screens.includes("melodyTraining"), "Page routing should support home and two training pages.");
  console.assert(getTrainingScreen("tone") === "toneTraining" && getTrainingScreen("melody") === "melodyTraining", "Each training mode should map to its own page.");
  console.assert(getModeFromScreen("home", "melody") === "melody", "Home route should preserve the selected mode fallback.");
  console.assert(getTrainingTitle("tone") === "声调训练" && getTrainingTitle("melody") === "旋律训练", "Training pages should have distinct titles.");
  console.assert(tonePracticeLyrics.length >= 6 && melodyPracticeLyrics.length >= 6, "Both tone and melody training should provide lyric data.");
  console.assert(tonePracticeLyrics[0].focus === "声调" && melodyPracticeLyrics[0].focus === "旋律", "Tone and melody lyric panels should emphasize different training goals.");
  console.assert(getNextLyricIndex(6, 7) === 0, "Lyric index should loop back to the first line.");
  console.assert(getCircularItem(["a", "b", "c"], -1, "a") === "c", "Circular item helper should support negative indexes.");
  console.assert(getCircularItem([], 2, "fallback") === "fallback", "Circular item helper should fall back on empty lists.");
  console.assert(clampProgress(-3) === 0 && clampProgress(123) === 100, "Progress should always be clamped to the valid range.");
  console.assert(typeof BottomPanel === "function", "Bottom panel component should be fully declared.");
  console.assert(typeof ControlButton === "function", "Control button component should be fully declared.");
  console.assert(typeof PracticePanel === "function", "Practice panel component should be fully declared.");
}

if (typeof window !== "undefined") runSmokeTests();

export default function LongchuanTuneReplica() {
  const [viewportScale, setViewportScale] = useState(() => (typeof window === "undefined" ? 1 : computeResponsiveScale(window.innerWidth, window.innerHeight)));
  const [selectedMode, setSelectedMode] = useState<Mode>("tone");
  const [screen, setScreen] = useState<Screen>("home");
  const [playback, setPlayback] = useState<PlaybackState>("idle");
  const [recording, setRecording] = useState<RecordingState>("recording");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lyricIndex, setLyricIndex] = useState(0);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const activeMode = getModeFromScreen(screen, selectedMode);
  const statusText = recording === "recording" ? "正在录音中" : "录音已结束";
  const progress = useMemo(() => clampProgress((elapsedSeconds / TRAINING_TOTAL_SECONDS) * 100), [elapsedSeconds]);
  const progressLabel = useMemo(() => formatTrainingTime(elapsedSeconds), [elapsedSeconds]);

  useEffect(() => {
    const handleResize = () => setViewportScale(computeResponsiveScale(window.innerWidth, window.innerHeight));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (screen === "home" || playback !== "playing") return;
    const total = getLyricCount(activeMode);
    const timer = window.setInterval(() => {
      setLyricIndex((current) => getNextLyricIndex(current, total));
    }, activeMode === "tone" ? 5800 : 6200);
    return () => window.clearInterval(timer);
  }, [screen, playback, activeMode]);

  useEffect(() => {
    if (screen === "home" || playback !== "playing") return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => Math.min(TRAINING_TOTAL_SECONDS, value + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, playback]);

  useEffect(() => {
    if (screen === "home" || playback !== "playing" || progress < 100) return;
    setPlayback("idle");
    setRecording("stopped");
    showToast("练习已到达结尾");
  }, [screen, playback, progress]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 900);
  }

  function openTrainingPage(mode: Mode) {
    setSelectedMode(mode);
    setPlayback("idle");
    setRecording("recording");
    setElapsedSeconds(0);
    setLyricIndex(0);
    setScreen(getTrainingScreen(mode));
    showToast(mode === "tone" ? "进入声调训练：看升降与轻重" : "进入旋律训练：看音高与节拍");
  }

  function returnHome() {
    setScreen("home");
    setPlayback("idle");
    showToast("已返回曲目主页");
  }

  function replay() {
    setElapsedSeconds(0);
    setLyricIndex(0);
    setPlayback("idle");
    setRecording("recording");
    showToast("已重置练习，从第一句开始");
  }

  function togglePlay() {
    const next = playback === "playing" ? "idle" : "playing";
    if (next === "playing" && progress >= 100) {
      setElapsedSeconds(0);
      setLyricIndex(0);
      setRecording("recording");
    }
    setPlayback(next);
    showToast(next === "playing" ? (activeMode === "tone" ? "开始声调歌词滚动" : "开始旋律歌词滚动") : "播放已暂停");
  }

  function finishRecording() {
    setRecording("stopped");
    setPlayback("idle");
    setLyricIndex(getLyricCount(activeMode) - 1);
    showToast("录音已完成，正在生成练习反馈");
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#211f1a] text-[#172132]">
      <AnimationStyles />
      <ModernAppStyles />
      <main className="relative aspect-[16/9] w-[min(100vw,177.777dvh)] max-w-[960px] shrink-0 overflow-x-hidden overflow-y-auto bg-[#f7f2e8] shadow-[0_0_70px_rgba(0,0,0,.45)]">
        <ModernBackground />
        <ModernHeader
          screen={screen}
          mode={activeMode}
          statusText={statusText}
          recording={recording}
          onBack={screen === "home" ? () => window.history.back() : returnHome}
          onOpenSettings={() => showToast("设置面板动效预览")}
          onOpenHelp={() => showToast("帮助面板动效预览")}
        />
        {screen === "home" ? (
          <ModernHome selectedMode={selectedMode} onOpenTraining={openTrainingPage} />
        ) : (
          <ModernTraining
            mode={activeMode}
            progress={progress}
            progressLabel={progressLabel}
            playback={playback}
            recording={recording}
            lyricIndex={lyricIndex}
            onReplay={replay}
            onTogglePlay={togglePlay}
            onFinish={finishRecording}
            onBack={returnHome}
          />
        )}
        {toast && <ModernToast message={toast} />}
      </main>
    </div>
  );
}

function AnimationStyles() {
  return <style>{`
    @keyframes deviceIn { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes cardRise { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(6px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @keyframes floatMist { 0%, 100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(-18px, 9px, 0) scale(1.018); } }
    @keyframes pulseDot { 0%, 100% { box-shadow: 0 0 0 0 rgba(25,187,89,.28); transform: scale(1); } 50% { box-shadow: 0 0 0 9px rgba(25,187,89,0); transform: scale(1.08); } }
    @keyframes soundBar { 0%, 100% { transform: scaleY(.55); } 50% { transform: scaleY(1.15); } }
    @keyframes tuneSwing { 0%, 100% { transform: rotate(-2deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-3px); } }
    @keyframes spinSoft { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes toastIn { 0% { opacity: 0; transform: translate(-50%, -16px) scale(.96); } 18%, 82% { opacity: 1; transform: translate(-50%, 0) scale(1); } 100% { opacity: 0; transform: translate(-50%, -12px) scale(.98); } }
    @keyframes progressGlow { 0%, 100% { opacity: .35; transform: translateX(-35%); } 50% { opacity: .85; transform: translateX(100%); } }
    @keyframes routeIn { from { opacity: 0; transform: translateX(38px) scale(.985); filter: blur(8px); } to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); } }
    @keyframes routeOutHint { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-5px); } }
    @keyframes lyricSlide { from { opacity: 0; transform: translateY(12px) scale(.98); filter: blur(3px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @keyframes lyricFocusIn { 0% { opacity: 0; transform: translateY(22px) scale(.965); filter: blur(8px); } 58% { opacity: 1; transform: translateY(-3px) scale(1.012); filter: blur(0); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @keyframes lyricPrevIn { from { opacity: 0; transform: translateY(-14px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
    @keyframes lyricNextIn { from { opacity: 0; transform: translateY(14px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
    @keyframes notationLift { 0% { opacity: 0; transform: translateY(12px); letter-spacing: .14em; } 100% { opacity: 1; transform: translateY(0); letter-spacing: 0; } }
    @keyframes lyricGlowSweep { from { transform: translateX(-120%); opacity: 0; } 35% { opacity: .72; } to { transform: translateX(120%); opacity: 0; } }
    @keyframes softBreath { 0%, 100% { transform: scale(1); opacity: .62; } 50% { transform: scale(1.045); opacity: .92; } }
    .animate-device-in { animation: deviceIn 560ms cubic-bezier(.2,.8,.2,1) both; }
    .animate-card-rise { animation: cardRise 680ms cubic-bezier(.18,.9,.22,1) 120ms both; }
    .animate-float-mist { animation: floatMist 12s ease-in-out infinite; transform-origin: center; }
    .animate-toast-in { animation: toastIn 900ms ease both; }
    .animate-route-in { animation: routeIn 520ms cubic-bezier(.2,.8,.2,1) both; }
    .animate-back-hint { animation: routeOutHint 1300ms ease-in-out infinite; }
    .animate-lyric-slide { animation: lyricSlide 520ms cubic-bezier(.2,.8,.2,1) both; }
    .lyric-focus-in { animation: lyricFocusIn 1280ms cubic-bezier(.16,.9,.24,1) both; }
    .lyric-prev-in { animation: lyricPrevIn 1040ms cubic-bezier(.2,.8,.2,1) both; }
    .lyric-next-in { animation: lyricNextIn 1040ms cubic-bezier(.2,.8,.2,1) both; }
    .notation-lift span { animation: notationLift 980ms cubic-bezier(.2,.8,.2,1) both; }
    .notation-lift span:nth-child(2) { animation-delay: 80ms; }
    .notation-lift span:nth-child(3) { animation-delay: 160ms; }
    .notation-lift span:nth-child(4) { animation-delay: 240ms; }
    .notation-lift span:nth-child(5) { animation-delay: 320ms; }
    .notation-lift span:nth-child(6) { animation-delay: 400ms; }
    .notation-lift span:nth-child(7) { animation-delay: 480ms; }
    .notation-lift span:nth-child(8) { animation-delay: 560ms; }
    .lyric-stage-card { position: relative; overflow: hidden; }
    .lyric-stage-card::after { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,.65) 48%, transparent 74%); animation: lyricGlowSweep 1320ms ease both; pointer-events: none; }
    .animate-soft-breath { animation: softBreath 2400ms ease-in-out infinite; }
    .tap-btn { position: relative; overflow: hidden; transform: translateZ(0); transition: transform 180ms ease, box-shadow 220ms ease, border-color 220ms ease, background-color 220ms ease; }
    .tap-btn:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(38,35,28,.12); }
    .tap-btn:active { transform: translateY(1px) scale(.965); }
    .tap-btn::after { content: ""; position: absolute; inset: 50%; width: 18px; height: 18px; border-radius: 999px; background: rgba(29,38,48,.10); transform: translate(-50%, -50%) scale(0); opacity: 0; pointer-events: none; transition: transform 420ms ease, opacity 520ms ease; }
    .tap-btn:active::after { transform: translate(-50%, -50%) scale(13); opacity: 1; transition: 0s; }
    .record-dot { animation: pulseDot 1400ms ease-in-out infinite; }
    .wave-active span { transform-origin: center; animation: soundBar 850ms ease-in-out infinite; }
    .wave-active span:nth-child(2) { animation-delay: 90ms; }
    .wave-active span:nth-child(3) { animation-delay: 180ms; }
    .wave-active span:nth-child(4) { animation-delay: 270ms; }
    .wave-active span:nth-child(5) { animation-delay: 360ms; }
    .tune-active { animation: tuneSwing 1250ms ease-in-out infinite; transform-origin: center; }
    .disc-playing svg { animation: spinSoft 1100ms linear infinite; }
    .progress-shine::after { content: ""; position: absolute; top: 0; bottom: 0; width: 80px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.72), transparent); animation: progressGlow 1900ms ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
  `}</style>;
}

function TopBar({ title, screen, statusText, recording, onBack, onOpenSettings, onOpenHelp }: { title: string; screen: Screen; statusText: string; recording: RecordingState; onBack: () => void; onOpenSettings: () => void; onOpenHelp: () => void }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-[126px] bg-[#fffdf8]/95 flex items-center px-[40px]">
      <button className="tap-btn w-[60px] h-[60px] rounded-full bg-white flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.10)] border border-[#efebe3]" aria-label={screen === "home" ? "返回" : "返回曲目主页"} onClick={onBack}>
        <ChevronLeftIcon size={36} strokeWidth={2.2} className="text-[#171b22]" />
      </button>
      <div className="ml-[48px] flex flex-col justify-center">
        <div className="font-serif text-[42px] leading-none tracking-[2px] font-black text-[#1f252e]">{title}</div>
        <div className="mt-[13px] flex items-center gap-[18px] text-[17px] tracking-[1px]">
          <span className="rounded-full px-[3px] text-[#e56b65] font-semibold">{screen === "home" ? "训练模式" : "训练页面"}</span>
          <span className="rounded-full px-[3px] text-[#5d6570]">七声音阶</span>
          <span className="rounded-full px-[3px] text-[#5d6570]">古风·中级</span>
        </div>
      </div>
      <div className={`absolute left-1/2 top-[48px] -translate-x-1/2 h-[45px] px-[24px] rounded-[13px] border bg-white flex items-center gap-[13px] text-[20px] text-[#46505b] shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${recording === "recording" ? "border-[#eee8de]" : "border-[#e5ded2] opacity-80"}`}>
        <span className={`w-[14px] h-[14px] rounded-full ${recording === "recording" ? "bg-[#19bb59] record-dot" : "bg-[#aeb4ba]"}`} />
        {statusText}
      </div>
      <div className="ml-auto flex items-center gap-[26px] mr-[8px]">
        <button className="tap-btn w-[54px] h-[54px] rounded-full bg-white border border-[#f0ebe3] flex items-center justify-center shadow-[0_5px_14px_rgba(0,0,0,0.08)]" aria-label="设置" onClick={onOpenSettings}>
          <SettingsIcon size={30} strokeWidth={2.3} className="text-[#1e242b]" />
        </button>
        <button className="tap-btn w-[54px] h-[54px] rounded-full bg-white border border-[#f0ebe3] flex items-center justify-center shadow-[0_5px_14px_rgba(0,0,0,0.08)]" aria-label="帮助" onClick={onOpenHelp}>
          <CircleHelpIcon size={31} strokeWidth={2.3} className="text-[#1e242b]" />
        </button>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return <div key={message} className="absolute left-1/2 top-[126px] z-50 -translate-x-1/2 rounded-full bg-[#111b2a]/92 px-[30px] py-[13px] text-[18px] tracking-[1.6px] text-white shadow-[0_14px_35px_rgba(17,27,42,0.28)] animate-toast-in">{message}</div>;
}

function Hero({ selectedMode, onOpenTraining }: { selectedMode: Mode; onOpenTraining: (mode: Mode) => void }) {
  return (
    <section className="absolute top-[126px] left-[40px] right-[40px] h-[727px] rounded-[23px] overflow-hidden border border-[#e8decd] bg-[#efe9d9] shadow-[inset_0_1px_8px_rgba(0,0,0,0.05)]">
      <InkLandscape />
      <div className="absolute inset-0 bg-[#eee8d7]/58" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_0%,rgba(255,250,241,0.06)_48%,rgba(238,229,211,0.42)_100%)]" />
      <div className="animate-card-rise absolute top-[44px] left-[307px] w-[842px] h-[620px] rounded-[48px] bg-white/93 backdrop-blur-sm shadow-[0_25px_42px_rgba(52,45,34,0.22),0_0_0_1px_rgba(218,213,204,0.9)] flex flex-col items-center">
        <h1 className="font-serif text-[68px] font-black tracking-[8px] leading-none mt-[76px] text-[#252d38] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">龙船调</h1>
        <div className="mt-[31px] w-[108px] h-[5px] bg-[#c51616] rounded-full shadow-[0_1px_2px_rgba(197,22,22,0.3)]" />
        <div className="mt-[25px] text-[20px] tracking-[2.2px] text-[#626a75] font-medium">湖北民歌　发布年代：20世纪50年代</div>
        <div className="mt-[58px] flex gap-[37px]">
          <TrainingCard type="tone" selected={selectedMode === "tone"} onClick={() => onOpenTraining("tone")} />
          <TrainingCard type="melody" selected={selectedMode === "melody"} onClick={() => onOpenTraining("melody")} />
        </div>
      </div>
    </section>
  );
}

function InkLandscape() {
  return (
    <svg className="animate-float-mist absolute inset-0 w-full h-full" viewBox="0 0 1456 727" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="softBlur"><feGaussianBlur stdDeviation="2.4" /></filter>
        <linearGradient id="mist" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d7d0bd" stopOpacity="0.44" />
          <stop offset="0.56" stopColor="#eee8d7" stopOpacity="0.20" />
          <stop offset="1" stopColor="#d0c5ae" stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <rect width="1456" height="727" fill="url(#mist)" />
      <g opacity="0.29" fill="#b5af9d" filter="url(#softBlur)">
        <path d="M-20 360 C55 252 92 188 140 213 C188 238 166 330 238 310 C304 293 327 190 382 196 C443 204 462 295 530 277 C590 261 625 204 681 230 C734 256 762 337 825 315 C895 291 931 220 1000 241 C1065 260 1073 338 1137 326 C1207 312 1251 213 1325 219 C1385 224 1436 312 1498 280 L1498 727 L-20 727 Z" />
        <path d="M24 206 C69 162 81 104 116 81 C140 66 158 99 153 141 C148 194 103 226 77 277 C47 337 68 389 24 444 Z" />
        <path d="M1277 178 C1300 119 1332 71 1362 95 C1393 118 1370 179 1412 207 C1451 235 1480 267 1461 341 C1433 324 1401 316 1383 362 C1355 307 1296 282 1277 178 Z" />
      </g>
      <g opacity="0.34" stroke="#a7a08c" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#softBlur)">
        <path d="M66 446 C181 422 291 423 388 447" />
        <path d="M1016 477 C1097 448 1187 451 1252 487" />
        <path d="M1084 291 C1141 237 1198 235 1268 288" />
        <path d="M1152 330 C1184 290 1240 286 1282 323" />
        <path d="M1130 405 C1198 380 1275 386 1325 421" />
        <path d="M1142 525 C1219 503 1302 513 1358 548" />
      </g>
      <g opacity="0.22" fill="#6f6b59">
        <circle cx="1236" cy="165" r="10" />
        <circle cx="1285" cy="142" r="8" />
        <circle cx="1308" cy="182" r="7" />
        <circle cx="78" cy="224" r="9" />
        <circle cx="126" cy="186" r="7" />
        <circle cx="202" cy="233" r="6" />
      </g>
      <g opacity="0.35" stroke="#8f8771" strokeWidth="2" fill="none">
        <path d="M1054 398 h108 v40 h-108 z" />
        <path d="M1071 398 v-28 h74 v28" />
        <path d="M1082 370 q26 -18 52 0" />
        <path d="M1187 409 h94 v38h-94z" />
        <path d="M1204 409 v-24 h60 v24" />
        <path d="M1220 385 q19 -16 39 0" />
      </g>
    </svg>
  );
}

function TrainingCard({ type, selected, onClick }: { type: Mode; selected: boolean; onClick: () => void }) {
  const isTone = type === "tone";
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`tap-btn group relative w-[349px] h-[283px] rounded-[35px] border bg-white/75 shadow-[inset_0_0_38px_rgba(255,250,235,0.44)] flex flex-col items-center transition-all duration-500 ${selected ? "border-[#d7c7ad] shadow-[0_14px_34px_rgba(65,54,36,0.12),inset_0_0_42px_rgba(255,248,226,0.42)]" : "border-[#e6e3dd] hover:border-[#d9cdbb]"}`}>
      <div className={`absolute inset-[9px] rounded-[28px] transition-all duration-500 ${selected ? "bg-[radial-gradient(circle_at_50%_8%,rgba(255,246,221,.95),rgba(255,255,255,0)_60%)] opacity-100" : "opacity-0"}`} />
      <div className={`relative mt-[38px] w-[104px] h-[110px] rounded-[17px] flex items-center justify-center ${isTone ? "bg-[#dfe6ff]" : "bg-[#ffe8be]"} shadow-[0_13px_32px_rgba(112,110,106,0.12)] transition-transform duration-500 group-hover:scale-105 ${selected ? "scale-105" : ""}`}>
        {isTone ? <WaveIcon active={selected} /> : <TuneIcon active={selected} />}
      </div>
      <div className="relative mt-[36px] text-[23px] font-bold tracking-[3px] text-[#1c222b]">{isTone ? "声调训练" : "旋律训练"}</div>
      <div className="relative mt-[19px] text-[19px] tracking-[2.5px] text-[#7a8089]">{isTone ? "练升降、轻重、尾音" : "练音高、节拍、连贯"}</div>
    </button>
  );
}

function WaveIcon({ active }: { active: boolean }) {
  return (
    <div className={`flex items-center gap-[7px] ${active ? "wave-active" : ""}`} aria-hidden="true">
      <span className="w-[7px] h-[16px] rounded-full bg-[#5d48d9]" />
      <span className="w-[8px] h-[39px] rounded-full bg-[#5d48d9]" />
      <span className="w-[9px] h-[59px] rounded-full bg-[#5d48d9]" />
      <span className="w-[8px] h-[42px] rounded-full bg-[#5d48d9]" />
      <span className="w-[7px] h-[18px] rounded-full bg-[#5d48d9]" />
    </div>
  );
}

function TuneIcon({ active }: { active: boolean }) {
  return (
    <div className={`relative w-[58px] h-[58px] ${active ? "tune-active" : ""}`} aria-hidden="true">
      <div className="absolute left-[9px] top-[24px] w-[40px] h-[18px] border-b-[5px] border-[#d56906] rounded-b-full" />
      <div className="absolute left-[5px] top-[16px] w-[8px] h-[8px] rounded-full bg-[#d56906]" />
      <div className="absolute right-[5px] top-[16px] w-[8px] h-[8px] rounded-full bg-[#d56906]" />
      <div className="absolute left-[14px] top-[25px] w-[5px] h-[14px] rounded-full bg-[#d56906] rotate-[-12deg]" />
      <div className="absolute right-[14px] top-[25px] w-[5px] h-[14px] rounded-full bg-[#d56906] rotate-[12deg]" />
    </div>
  );
}

function TrainingPage({ mode, progress, progressLabel, playback, recording, lyricIndex, onReplay, onTogglePlay, onFinish, onBack }: { mode: Mode; progress: number; progressLabel: string; playback: PlaybackState; recording: RecordingState; lyricIndex: number; onReplay: () => void; onTogglePlay: () => void; onFinish: () => void; onBack: () => void }) {
  const isTone = mode === "tone";
  return (
    <section className="animate-route-in absolute top-[126px] left-[40px] right-[40px] bottom-[38px] rounded-[24px] overflow-hidden border border-[#e8decd] bg-[#f6f0e4] shadow-[inset_0_1px_8px_rgba(0,0,0,0.05)]">
      <InkLandscape />
      <div className="absolute inset-0 bg-[#f5eedf]/72" />
      <div className="absolute inset-[28px] rounded-[34px] bg-white/92 shadow-[0_24px_46px_rgba(55,45,32,0.18),0_0_0_1px_rgba(222,215,203,0.78)]" />
      <div className="absolute left-[86px] top-[76px] w-[470px]">
        <button type="button" onClick={onBack} className="tap-btn mb-[36px] h-[48px] rounded-full border border-[#eadfce] bg-white px-[22px] text-[18px] tracking-[1.8px] text-[#33404d] shadow-[0_8px_18px_rgba(0,0,0,0.05)] flex items-center gap-[10px]">
          <span className="animate-back-hint inline-flex"><ChevronLeftIcon size={23} strokeWidth={2.4} /></span>
          返回曲目主页
        </button>
        <div className={`text-[22px] tracking-[3px] font-semibold ${isTone ? "text-[#4f57c8]" : "text-[#b76a16]"}`}>{isTone ? "Tone Contour Practice" : "Melody Pitch Practice"}</div>
        <h2 className="mt-[18px] font-serif text-[72px] leading-none tracking-[5px] font-black text-[#202936]">{getTrainingTitle(mode)}</h2>
        <div className={`mt-[30px] w-[112px] h-[5px] rounded-full ${isTone ? "bg-[#5d48d9]" : "bg-[#d56906]"}`} />
        <p className="mt-[30px] text-[24px] leading-[1.8] tracking-[2.5px] text-[#5f6874]">{getTrainingDescription(mode)}</p>
        <div className="mt-[42px] grid grid-cols-2 gap-[18px]">
          <InfoCard label={isTone ? "训练重点" : "旋律重点"} value={isTone ? "声调" : "旋律"} />
          <InfoCard label="本次进度" value={progressLabel} />
        </div>
      </div>
      <PracticePanel mode={mode} progress={progress} progressLabel={progressLabel} playback={playback} recording={recording} lyricIndex={lyricIndex} onReplay={onReplay} onTogglePlay={onTogglePlay} onFinish={onFinish} />
    </section>
  );
}

function PracticePanel({ mode, progress, progressLabel, playback, recording, lyricIndex, onReplay, onTogglePlay, onFinish }: { mode: Mode; progress: number; progressLabel: string; playback: PlaybackState; recording: RecordingState; lyricIndex: number; onReplay: () => void; onTogglePlay: () => void; onFinish: () => void }) {
  const isTone = mode === "tone";
  return (
    <div className="absolute right-[76px] top-[72px] w-[700px] h-[560px] rounded-[42px] border border-[#eadfce] bg-white/82 shadow-[inset_0_0_50px_rgba(255,246,224,0.52),0_24px_50px_rgba(73,60,40,0.12)] flex flex-col items-center justify-center px-[40px] overflow-hidden">
      <div className="shrink-0">
        {isTone ? <ToneLyricsPanel activeIndex={lyricIndex} isPlaying={playback === "playing"} /> : <MelodyLyricsPanel activeIndex={lyricIndex} isPlaying={playback === "playing"} />}
      </div>
      <ProgressBar progress={progress} progressLabel={progressLabel} className="mt-[22px]" />
      <div className="mt-[28px] flex items-center justify-center gap-[28px] shrink-0">
        <ControlButton icon={<RotateCcwIcon size={34} strokeWidth={2.1} />} label="重录" onClick={onReplay} />
        <ControlButton icon={playback === "playing" ? <PauseIcon size={32} strokeWidth={2.1} /> : <PlayIcon size={32} strokeWidth={2.1} />} label={playback === "playing" ? "暂停" : "开始"} onClick={onTogglePlay} active={playback === "playing"} />
        <button className={`tap-btn w-[118px] h-[103px] rounded-[18px] bg-[#101b2c] text-white flex flex-col items-center justify-center gap-[12px] shadow-[0_10px_25px_rgba(16,27,44,0.24)] ${recording === "recording" ? "disc-playing" : "opacity-90"}`} aria-label="结束录音" onClick={onFinish}>
          <DiscIcon size={39} strokeWidth={2.1} />
          <span className="text-[17px] tracking-[2.2px]">结束录音</span>
        </button>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#eee4d6] bg-white/80 p-[22px] shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <div className="text-[17px] tracking-[2px] text-[#838a93]">{label}</div>
      <div className="mt-[10px] text-[30px] font-bold text-[#202936]">{value}</div>
    </div>
  );
}

function PanelHeader({ isPlaying, label, color }: { isPlaying: boolean; label: string; color: string }) {
  return (
    <div className={`absolute left-[28px] top-[22px] z-20 flex items-center gap-[12px] text-[18px] font-bold tracking-[2px] ${color}`}>
      <span className={`w-[10px] h-[10px] rounded-full ${isPlaying ? "bg-[#19bb59] record-dot" : "bg-[#d4c7b4]"}`} />
      {label}
    </div>
  );
}

function ToneLyricsPanel({ activeIndex, isPlaying }: { activeIndex: number; isPlaying: boolean }) {
  const current = getCircularItem(tonePracticeLyrics, activeIndex, tonePracticeLyrics[0]);
  const previous = getCircularItem(tonePracticeLyrics, activeIndex - 1, current);
  const next = getCircularItem(tonePracticeLyrics, activeIndex + 1, current);
  return (
    <div className="relative w-[560px] h-[306px] overflow-hidden rounded-[34px] border border-[#e2e5ff] bg-[linear-gradient(145deg,rgba(255,255,255,.96),rgba(241,244,255,.92))] shadow-[0_22px_55px_rgba(70,80,160,0.12),inset_0_1px_0_rgba(255,255,255,.85)]">
      <div className="absolute -right-[54px] -top-[62px] h-[190px] w-[190px] rounded-full bg-[#dfe5ff]/80 blur-2xl animate-soft-breath" />
      <div className="absolute -left-[70px] bottom-[-78px] h-[210px] w-[210px] rounded-full bg-[#f4efe3]/70 blur-2xl" />
      <PanelHeader isPlaying={isPlaying} label="声调歌词跟读" color="text-[#4f57c8]" />
      <div className="absolute right-[28px] top-[20px] z-20 rounded-full border border-[#dfe4ff] bg-white/85 px-[15px] py-[7px] text-[14px] font-bold tracking-[2px] text-[#6f78d5]">升降 · 轻重 · 尾音</div>
      <div className="relative z-10 grid h-full grid-rows-[62px_34px_94px_28px_72px] px-[28px] pb-[18px] pt-[64px]">
        <div className="self-center truncate text-center text-[17px] font-semibold tracking-[2.4px] text-[#9aa1bf]/62">{previous.lyric}</div>
        <div key={`tone-current-${activeIndex}`} className="animate-lyric-slide row-span-2 flex min-h-0 flex-col items-center justify-center rounded-[24px] border border-[#d9defd] bg-white/92 px-[20px] shadow-[0_16px_34px_rgba(79,87,200,.11)]">
          <div className="max-w-full truncate text-[30px] font-black tracking-[3px] text-[#202936]">{current.lyric}</div>
          <div className="mt-[6px] max-w-full truncate text-[14px] font-semibold tracking-[2px] text-[#5d48d9]">{current.guide}</div>
        </div>
        <div className="self-center truncate text-center text-[16px] font-semibold tracking-[2.2px] text-[#9aa1bf]/36">{next.lyric}</div>
        <div className="grid min-h-0 grid-cols-[1fr_170px] gap-[16px]">
          <div className="min-w-0 rounded-[20px] border border-[#e0e4ff] bg-white/86 px-[18px] py-[10px] shadow-[0_8px_20px_rgba(69,78,160,.06)]">
            <div className="truncate text-[13px] font-bold tracking-[2px] text-[#8b92c7]">当前声调提示</div>
            <div className="mt-[4px] truncate text-[19px] font-black tracking-[2px] text-[#313a9f]">{current.contour}</div>
          </div>
          <ToneContourMini activeIndex={activeIndex} />
        </div>
      </div>
    </div>
  );
}

function ToneContourMini({ activeIndex }: { activeIndex: number }) {
  const paths = [
    "M8 58 C38 54 55 34 82 36 C111 38 124 60 154 52",
    "M8 50 C36 64 60 58 82 38 C106 16 128 22 154 34",
    "M8 38 C38 18 62 32 82 48 C108 70 128 66 154 44",
  ];
  const path = getCircularItem(paths, activeIndex, paths[0]);
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[20px] border border-[#e0e4ff] bg-[#f6f8ff]/88 px-[14px] py-[9px] shadow-[inset_0_1px_0_rgba(255,255,255,.75)]">
      <div className="truncate text-[12px] font-bold tracking-[2px] text-[#8b92c7]">声线走势</div>
      <svg viewBox="0 0 162 70" className="h-[42px] w-full" aria-hidden="true">
        <path d={path} fill="none" stroke="#5d48d9" strokeWidth="5" strokeLinecap="round" />
        <circle cx="82" cy="38" r="6" fill="#fff" stroke="#5d48d9" strokeWidth="4" />
      </svg>
    </div>
  );
}

function MelodyLyricsPanel({ activeIndex, isPlaying }: { activeIndex: number; isPlaying: boolean }) {
  const current = getCircularItem(melodyPracticeLyrics, activeIndex, melodyPracticeLyrics[0]);
  const previous = getCircularItem(melodyPracticeLyrics, activeIndex - 1, current);
  const next = getCircularItem(melodyPracticeLyrics, activeIndex + 1, current);
  return (
    <div className="relative w-[560px] h-[306px] overflow-hidden rounded-[34px] border border-[#f1dfbc] bg-[linear-gradient(145deg,rgba(255,253,247,.98),rgba(255,244,222,.9))] shadow-[0_22px_55px_rgba(173,109,30,0.12),inset_0_1px_0_rgba(255,255,255,.9)]">
      <div className="absolute -right-[58px] -top-[62px] h-[190px] w-[190px] rounded-full bg-[#ffe4b8]/80 blur-2xl animate-soft-breath" />
      <div className="absolute -left-[80px] bottom-[-84px] h-[220px] w-[220px] rounded-full bg-[#f1eadc]/70 blur-2xl" />
      <PanelHeader isPlaying={isPlaying} label="旋律歌词跟唱" color="text-[#b76a16]" />
      <div className="absolute right-[28px] top-[20px] z-20 rounded-full border border-[#f0d29b] bg-white/85 px-[15px] py-[7px] text-[14px] font-bold tracking-[2px] text-[#c58634]">音高 · 节拍 · 连贯</div>
      <div className="relative z-10 grid h-full grid-rows-[70px_40px_86px_28px_64px] px-[28px] pb-[18px] pt-[58px]">
        <MelodyStaff notation={current.notation} />
        <div className="self-center truncate text-center text-[16px] font-semibold tracking-[2.4px] text-[#b49b78]/52">{previous.lyric}</div>
        <div key={`melody-current-${activeIndex}`} className="animate-lyric-slide flex min-h-0 flex-col items-center justify-center rounded-[24px] border border-[#f0d29b] bg-white/92 px-[20px] shadow-[0_16px_34px_rgba(181,103,22,.11)]">
          <div className="max-w-full truncate text-[29px] font-black tracking-[3px] text-[#202936]">{current.lyric}</div>
          <div className="mt-[6px] max-w-full truncate text-[15px] font-black tracking-[4px] text-[#d56906]">{current.notation}</div>
        </div>
        <div className="self-center truncate text-center text-[16px] font-semibold tracking-[2.2px] text-[#b49b78]/34">{next.lyric}</div>
        <div className="min-h-0 rounded-[20px] border border-[#f2ddb9] bg-white/86 px-[18px] py-[9px] shadow-[0_8px_20px_rgba(181,103,22,.06)]">
          <div className="truncate text-[13px] font-bold tracking-[2px] text-[#c69b58]">当前旋律提示</div>
          <div className="mt-[4px] truncate text-[20px] font-black tracking-[3px] text-[#b76a16]">{current.rhythm}</div>
        </div>
      </div>
    </div>
  );
}

function MelodyStaff({ notation }: { notation: string }) {
  return (
    <div className="relative h-full min-h-0">
      <div className="absolute left-[8px] right-[8px] top-[9px] space-y-[8px]" aria-hidden="true">
        {[0, 1, 2, 3].map((line) => (
          <div key={line} className="h-px bg-[#dfb86f]/56" />
        ))}
      </div>
      <div className="absolute inset-x-[24px] top-[22px] truncate text-center text-[18px] font-black tracking-[7px] text-[#d56906]/72">{notation}</div>
    </div>
  );
}

function ProgressBar({ progress, progressLabel, className = "" }: { progress: number; progressLabel: string; className?: string }) {
  return (
    <div className={`w-[534px] shrink-0 ${className}`}>
      <div className="relative h-[23px] overflow-hidden rounded-full border border-[#cfc9c0] bg-[#d8d8d8] shadow-[inset_0_3px_8px_rgba(0,0,0,0.18)]">
        <div className="progress-shine absolute inset-y-[2px] left-[2px] overflow-hidden rounded-full bg-[linear-gradient(90deg,#f8f2e9,#ffffff)] shadow-[0_0_18px_rgba(255,255,255,.78)]" style={{ width: `${clampProgress(progress)}%` }} />
      </div>
      <div className="mt-[14px] grid grid-cols-3 text-[17px] tracking-[0.7px] text-[#6d7480]">
        <span>0:00</span>
        <span className="text-center">本次 {progressLabel}</span>
        <span className="text-right">25:00</span>
      </div>
    </div>
  );
}

function ControlButton({ icon, label, onClick, active = false }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" className={`tap-btn h-[103px] w-[95px] rounded-[18px] border flex flex-col items-center justify-center gap-[12px] ${active ? "border-[#cfd8f4] bg-[#eef3ff] text-[#3340aa]" : "border-[#eadfce] bg-white text-[#101b2c]"} shadow-[0_8px_20px_rgba(0,0,0,0.06)]`} aria-label={label} onClick={onClick}>
      {icon}
      <span className="text-[17px] font-semibold tracking-[2px]">{label}</span>
    </button>
  );
}

function BottomPanel({ selectedMode, progress, progressLabel, playback, recording, onReplay, onTogglePlay, onFinish }: { selectedMode: Mode; progress: number; progressLabel: string; playback: PlaybackState; recording: RecordingState; onReplay: () => void; onTogglePlay: () => void; onFinish: () => void }) {
  return (
    <section className="absolute bottom-[42px] left-[40px] right-[40px] h-[214px] rounded-[24px] border border-[#e6ddcd] bg-white/88 shadow-[0_18px_36px_rgba(52,45,34,0.12)]">
      <div className="absolute left-[54px] top-[42px]">
        <div className="text-[18px] font-bold tracking-[2px] text-[#8a7d6a]">当前训练</div>
        <div className="mt-[12px] text-[34px] font-black tracking-[3px] text-[#202936]">{getTrainingTitle(selectedMode)}</div>
      </div>
      <div className="absolute left-[366px] top-[48px]">
        <ProgressBar progress={progress} progressLabel={progressLabel} />
      </div>
      <div className="absolute right-[54px] top-[44px] flex items-center gap-[20px]">
        <ControlButton icon={<RotateCcwIcon size={32} strokeWidth={2.1} />} label="重录" onClick={onReplay} />
        <ControlButton icon={playback === "playing" ? <PauseIcon size={30} strokeWidth={2.1} /> : <PlayIcon size={30} strokeWidth={2.1} />} label={playback === "playing" ? "暂停" : "开始"} onClick={onTogglePlay} active={playback === "playing"} />
        <button className={`tap-btn h-[103px] w-[118px] rounded-[18px] bg-[#101b2c] text-white flex flex-col items-center justify-center gap-[12px] shadow-[0_10px_25px_rgba(16,27,44,0.24)] ${recording === "recording" ? "disc-playing" : "opacity-90"}`} aria-label="结束录音" onClick={onFinish}>
          <DiscIcon size={37} strokeWidth={2.1} />
          <span className="text-[17px] font-semibold tracking-[2px]">结束录音</span>
        </button>
      </div>
    </section>
  );
}

function ModernAppStyles() {
  return <style>{`
    .modern-surface { border-radius: 8px; border: 1px solid rgba(32,41,54,.10); background: rgba(255,253,247,.92); box-shadow: 0 22px 50px rgba(41,35,25,.10); }
    .modern-soft { border-radius: 8px; border: 1px solid rgba(32,41,54,.09); background: rgba(255,255,255,.72); box-shadow: 0 12px 30px rgba(41,35,25,.07); }
    .modern-button { border-radius: 8px; transition: transform 160ms ease, box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease; }
    .modern-button:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(24,31,42,.12); }
    .modern-button:active { transform: translateY(0); }
    .score-line { background: linear-gradient(90deg, transparent, rgba(183,106,22,.38), transparent); }
    .tone-line { background: linear-gradient(90deg, transparent, rgba(79,87,200,.32), transparent); }
  `}</style>;
}

function ModernBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#fffaf0_0%,#f1e8d8_46%,#e8eef8_100%)]" />
      <svg className="absolute inset-x-0 bottom-0 h-[48vh] w-full opacity-[0.32]" viewBox="0 0 1440 520" preserveAspectRatio="none">
        <path d="M0 302 C130 246 220 252 340 302 C460 354 562 352 702 278 C832 210 960 210 1082 284 C1200 354 1302 360 1440 300 L1440 520 L0 520 Z" fill="#d8cdb8" />
        <path d="M0 372 C176 318 286 344 416 386 C544 428 634 418 760 356 C914 280 1028 306 1172 380 C1266 428 1360 418 1440 382 L1440 520 L0 520 Z" fill="#c9d2df" opacity=".62" />
        <path d="M1040 264 h104 v54 h-104zM1070 264 v-34 h44v34M1198 286 h144 v62h-144zM1231 286 v-42 h76v42" fill="none" stroke="#8b806e" strokeWidth="5" strokeLinecap="round" opacity=".28" />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.82),rgba(255,255,255,0)_54%)]" />
    </div>
  );
}

function ModernHeader({ screen, mode, statusText, recording, onBack, onOpenSettings, onOpenHelp }: { screen: Screen; mode: Mode; statusText: string; recording: RecordingState; onBack: () => void; onOpenSettings: () => void; onOpenHelp: () => void }) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[960px] items-center gap-4 px-5 py-4">
      <button className="modern-button grid h-11 w-11 shrink-0 place-items-center border border-[#ded6c8] bg-white/85 text-[#172132]" aria-label={screen === "home" ? "返回" : "返回曲目主页"} onClick={onBack}>
        <ChevronLeftIcon size={26} strokeWidth={2.3} />
      </button>
      <div className="min-w-0">
        <div className="truncate font-serif text-[clamp(28px,8vw,38px)] font-black leading-none tracking-[1px] text-[#172132]">{screen === "home" ? "龙船调训练" : getTrainingTitle(mode)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tracking-[1px] text-[#687181]">
          <span className={mode === "tone" ? "text-[#4f57c8]" : "text-[#b76a16]"}>{screen === "home" ? "训练主页" : "训练页面"}</span>
          <span>七声音阶</span>
          <span>古风·中级</span>
        </div>
      </div>
      {screen !== "home" && (
        <div className="ml-auto hidden items-center gap-3 rounded-[8px] border border-[#e5dccd] bg-white/76 px-4 py-3 text-sm font-semibold text-[#46505b] shadow-[0_10px_24px_rgba(37,31,22,.06)]">
          <span className={`h-3 w-3 rounded-full ${recording === "recording" ? "bg-[#19bb59] record-dot" : "bg-[#aeb4ba]"}`} />
          {statusText}
        </div>
      )}
      <div className={`${screen === "home" ? "ml-auto" : ""} flex items-center gap-3`}>
        <button className="modern-button grid h-10 w-10 place-items-center border border-[#ded6c8] bg-white/85 text-[#172132]" aria-label="设置" onClick={onOpenSettings}>
          <SettingsIcon size={22} strokeWidth={2.3} />
        </button>
        <button className="modern-button grid h-10 w-10 place-items-center border border-[#ded6c8] bg-white/85 text-[#172132]" aria-label="帮助" onClick={onOpenHelp}>
          <CircleHelpIcon size={23} strokeWidth={2.3} />
        </button>
      </div>
    </header>
  );
}

function ModernToast({ message }: { message: string }) {
  return <div key={message} className="animate-toast-in pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#e0d3bd] bg-[#fffaf1]/96 px-6 py-3 text-sm font-bold tracking-[1px] text-[#101b2c] shadow-[0_18px_38px_rgba(80,62,34,.18)]">{message}</div>;
}

function ModernHome({ selectedMode, onOpenTraining }: { selectedMode: Mode; onOpenTraining: (mode: Mode) => void }) {
  return (
    <section className="relative z-10 mx-auto grid w-full max-w-[960px] grid-cols-[1fr_1fr] gap-4 px-5 pb-5 pt-1">
      <div className="modern-surface relative min-h-[300px] overflow-hidden p-6">
        <HomeHeroLandscape />
        <div className="relative z-10 max-w-[580px]">
          <div className="text-xs font-black uppercase tracking-[5px] text-[#b76a16]">Longchuan Folk Training</div>
          <h1 className="mt-5 font-serif text-[72px] font-black leading-[0.95] tracking-[1px] text-[#172132]">龙船调</h1>
          <div className="mt-7 flex items-center gap-4">
            <div className="h-1.5 w-28 rounded-full bg-[#d66a05]" />
            <div className="h-px w-10 bg-[#c6ad87]" />
          </div>
          <p className="mt-6 max-w-[360px] text-base leading-[1.65] tracking-[1px] text-[#33404d]">面向歌唱练习的沉浸式训练界面，按声调与旋律拆分听辨重点。</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <HomeFeaturePill icon={<TuneIcon active={false} />} label="曲目" value="湖北民歌" tone="warm" />
            <HomeFeaturePill icon={<ShieldIcon />} label="难度" value="中级" tone="cool" />
          </div>
        </div>
      </div>
      <div className="grid gap-5">
        <ModernModeCard mode="tone" selected={selectedMode === "tone"} onClick={() => onOpenTraining("tone")} />
        <ModernModeCard mode="melody" selected={selectedMode === "melody"} onClick={() => onOpenTraining("melody")} />
      </div>
      <HomeProfilePanel />
    </section>
  );
}

function ModernStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="modern-soft p-5">
      <div className="text-sm font-bold tracking-[2px] text-[#7e8793]">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-[1px] text-[#172132]">{value}</div>
    </div>
  );
}

function ModernModeCard({ mode, selected, onClick }: { mode: Mode; selected: boolean; onClick: () => void }) {
  const isTone = mode === "tone";
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`modern-button group relative grid min-h-[142px] grid-cols-[76px_1fr_42px] items-center gap-4 overflow-hidden border bg-white/82 p-4 text-left ${isTone ? "border-[#d8d2ff]" : "border-[#f0d2a6]"} ${selected ? "shadow-[0_18px_34px_rgba(41,35,25,.13)]" : "shadow-[0_12px_24px_rgba(41,35,25,.07)]"}`}>
      <div className={`pointer-events-none absolute -right-6 bottom-0 h-24 w-64 opacity-50 ${isTone ? "text-[#8178e6]" : "text-[#e99a34]"}`}>
        <HomeWaveLines />
      </div>
      <div className={`relative grid h-[70px] w-[70px] place-items-center rounded-full border bg-white/62 shadow-[inset_0_0_0_5px_rgba(255,255,255,.42)] ${isTone ? "border-[#c8c1ff] text-[#5d48d9]" : "border-[#f0bd7c] text-[#d56906]"}`}>
        <ModeMedallion isTone={isTone} active={selected} />
      </div>
      <div className="min-w-0">
        <div className={`text-[11px] font-black uppercase tracking-[3px] ${isTone ? "text-[#5d48d9]" : "text-[#b76a16]"}`}>{isTone ? "Tone Contour" : "Melody Pitch"}</div>
        <div className="mt-2 font-serif text-[32px] font-black leading-none tracking-[1px] text-[#172132]">{getTrainingTitle(mode)}</div>
        <p className="mt-3 text-sm leading-[1.45] tracking-[1px] text-[#4f5c6b]">{getTrainingDescription(mode)}</p>
      </div>
      <div className={`relative grid h-10 w-10 place-items-center rounded-full border bg-white/82 shadow-[0_10px_20px_rgba(41,35,25,.12)] ${isTone ? "border-[#d8d2ff] text-[#5d48d9]" : "border-[#f0d2a6] text-[#d56906]"}`}>
        <ChevronLeftIcon size={24} strokeWidth={2.4} className="rotate-180" />
      </div>
    </button>
  );
}

function HomeHeroLandscape() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.42]" viewBox="0 0 700 445" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 322 C72 250 126 262 194 318 C270 380 338 358 424 270 C494 198 574 164 700 230 L700 445 L0 445 Z" fill="#d7c8af" opacity=".56" />
      <path d="M0 356 C104 302 184 340 258 374 C356 420 430 354 502 302 C578 246 640 286 700 332 L700 445 L0 445 Z" fill="#e9ddc8" />
      <path d="M34 372 C56 306 82 248 104 176M70 324 C104 298 140 298 170 326M64 274 C102 252 136 258 164 282M92 222 C124 200 158 210 184 236" stroke="#aa8b60" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".55" />
      <path d="M84 386 C142 360 202 362 252 388M510 344 C560 312 618 318 666 354" stroke="#aa8b60" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".36" />
      <path d="M538 338 h88 v32 h-88zM560 338 v-25 h45v25" fill="none" stroke="#806f56" strokeWidth="3" opacity=".28" />
    </svg>
  );
}

function HomeFeaturePill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "warm" | "cool" }) {
  return (
    <div className="modern-soft flex items-center gap-4 p-4">
      <div className={`grid h-12 w-12 place-items-center rounded-full ${tone === "warm" ? "bg-[#fff0dc] text-[#d56906]" : "bg-[#ebe8ff] text-[#5d48d9]"}`}>{icon}</div>
      <div>
        <div className="text-sm font-bold tracking-[1px] text-[#6f7890]">{label}</div>
        <div className="mt-1 text-xl font-black tracking-[1px] text-[#172132]">{value}</div>
      </div>
    </div>
  );
}

function ModeMedallion({ isTone, active }: { isTone: boolean; active: boolean }) {
  return (
    <div className="relative grid h-[58px] w-[58px] place-items-center overflow-hidden rounded-full">
      <svg className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 104 104" aria-hidden="true">
        <path d="M0 76 C18 54 34 62 50 74 C70 90 82 66 104 54 L104 104 L0 104 Z" fill={isTone ? "#c8c1ff" : "#f7c47c"} />
        <path d="M0 84 C22 72 42 78 60 88 C78 98 92 84 104 76 L104 104 L0 104 Z" fill={isTone ? "#8178e6" : "#e99a34"} opacity=".42" />
      </svg>
      <div className="relative z-10 scale-75">{isTone ? <WaveIcon active={active} /> : <TuneIcon active={active} />}</div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5.2c0 4.3-2.8 7.8-7 9.8c-4.2-2-7-5.5-7-9.8V6l7-3Z" fill="currentColor" opacity=".88" />
      <path d="M12 7.2l1.2 2.4l2.6.38l-1.9 1.86l.45 2.62L12 13.22l-2.35 1.24l.45-2.62l-1.9-1.86l2.6-.38L12 7.2Z" fill="#fff" />
    </svg>
  );
}

function HomeWaveLines() {
  return (
    <svg viewBox="0 0 260 100" className="h-full w-full" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((line) => (
        <path key={line} d={`M10 ${80 - line * 12} C64 ${34 - line * 2} 120 ${36 + line * 3} 170 ${66 - line * 5} C204 ${86 - line * 4} 232 ${58 - line * 2} 254 ${42 + line * 2}`} fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".28" />
      ))}
    </svg>
  );
}

function HomeProfilePanel() {
  return (
    <div className="modern-surface col-span-2 grid grid-cols-[360px_1fr] gap-5 p-5">
      <div className="flex items-center gap-4">
        <HomePortrait />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e2a54c] text-white"><ShieldIcon /></span>
            <div className="font-serif text-2xl font-black tracking-[2px] text-[#172132]">和韵琴心</div>
          </div>
          <div className="mt-4 text-sm font-semibold leading-[1.7] tracking-[1px] text-[#4f5c6b]">累计训练 48天<br />总时长32.6小时</div>
          <div className="mt-3 text-base font-semibold tracking-[1px] text-[#4f5c6b]">坚持练习，静待花开</div>
        </div>
      </div>
      <div className="border-l border-[#dfd2bd] pl-6">
        <div className="font-serif text-2xl font-black tracking-[2px] text-[#172132]">今日训练进度</div>
        <div className="mt-8 max-w-[520px]">
          <div className="relative h-4 rounded-full bg-[#eadfce] shadow-[inset_0_2px_6px_rgba(36,31,24,.12)]">
            <div className="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,#c96305,#e7a144)]" />
            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#e5a14a] shadow-[0_6px_15px_rgba(201,99,5,.25)]" />
          </div>
          <div className="mt-5 grid grid-cols-3 text-sm font-semibold tracking-[1px] text-[#33404d]">
            <span>08:35</span>
            <span className="text-center text-[#c96305]">本次 12:30</span>
            <span className="text-right">25:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePortrait() {
  return (
    <div className="relative h-32 w-36 shrink-0">
      <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full border border-[#dfd2bd] bg-[linear-gradient(145deg,#fff7ec,#dfe8f5)] shadow-[0_14px_30px_rgba(36,31,24,.12)]">
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          <circle cx="60" cy="60" r="60" fill="#f7ead8" />
          <path d="M18 39 C36 12 84 12 102 39 C85 31 35 31 18 39Z" fill="#d7e7f4" />
          <path d="M22 34 C38 18 82 18 98 34" stroke="#c9483e" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="42" cy="50" r="5" fill="#df3d32" />
          <circle cx="60" cy="42" r="5" fill="#21a5a5" />
          <circle cx="78" cy="50" r="5" fill="#df3d32" />
          <path d="M39 53 C40 38 80 38 81 53 L85 102 H35 L39 53Z" fill="#10233c" />
          <ellipse cx="60" cy="68" rx="25" ry="30" fill="#ffe1c9" />
          <path d="M45 68 C50 64 55 64 60 68 C65 64 70 64 75 68" fill="none" stroke="#172132" strokeWidth="2" strokeLinecap="round" />
          <path d="M52 82 C57 86 64 86 69 82" fill="none" stroke="#b35f52" strokeWidth="2" strokeLinecap="round" />
          <path d="M31 84 C42 98 78 98 89 84 L94 120 H26 L31 84Z" fill="#1686ad" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 z-20 rounded-[8px] bg-[#c51616] px-3 py-1.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(197,22,22,.22)]">{AVATAR_LEVEL_LABEL}</div>
    </div>
  );
}

function ModernTraining({ mode, progress, progressLabel, playback, recording, lyricIndex, onReplay, onTogglePlay, onFinish, onBack }: { mode: Mode; progress: number; progressLabel: string; playback: PlaybackState; recording: RecordingState; lyricIndex: number; onReplay: () => void; onTogglePlay: () => void; onFinish: () => void; onBack: () => void }) {
  const isTone = mode === "tone";
  return (
    <section className="relative z-10 mx-auto grid w-full max-w-[960px] grid-cols-[260px_1fr] gap-4 px-5 pb-5 pt-1">
      <aside className="modern-surface self-start p-5">
        <button type="button" onClick={onBack} className="modern-button inline-flex h-11 items-center gap-2 border border-[#ded6c8] bg-white/88 px-4 text-sm font-bold tracking-[1px] text-[#33404d]">
          <ChevronLeftIcon size={20} strokeWidth={2.3} />
          返回曲目主页
        </button>
        <div className={`mt-5 text-[11px] font-black uppercase tracking-[3px] ${isTone ? "text-[#4f57c8]" : "text-[#b76a16]"}`}>{isTone ? "Tone Contour Practice" : "Melody Pitch Practice"}</div>
        <h2 className="mt-3 font-serif text-[42px] font-black leading-none tracking-[1px] text-[#172132]">{getTrainingTitle(mode)}</h2>
        <div className={`mt-5 h-1.5 w-20 rounded-full ${isTone ? "bg-[#4f57c8]" : "bg-[#d56906]"}`} />
        <p className="mt-5 text-sm leading-[1.75] tracking-[1px] text-[#566273]">{getTrainingDescription(mode)}</p>
        <div className="mt-5 grid gap-3">
          <ModernStat label={isTone ? "训练重点" : "旋律重点"} value={isTone ? "声调" : "旋律"} />
          <ModernStat label="本次进度" value={progressLabel} />
          {!isTone && <ModernStat label="当前段落" value="主歌A" />}
        </div>
      </aside>
      <ModernPracticeCard mode={mode} progress={progress} progressLabel={progressLabel} playback={playback} recording={recording} lyricIndex={lyricIndex} onReplay={onReplay} onTogglePlay={onTogglePlay} onFinish={onFinish} />
    </section>
  );
}

function ModernPracticeCard({ mode, progress, progressLabel, playback, recording, lyricIndex, onReplay, onTogglePlay, onFinish }: { mode: Mode; progress: number; progressLabel: string; playback: PlaybackState; recording: RecordingState; lyricIndex: number; onReplay: () => void; onTogglePlay: () => void; onFinish: () => void }) {
  const isTone = mode === "tone";
  return (
    <section className="modern-surface grid gap-3 p-4">
      <div className="flex items-center justify-between gap-4 border-b border-[#e7ddcf] pb-3">
        <div>
          <div className={`text-xs font-black tracking-[3px] ${isTone ? "text-[#4f57c8]" : "text-[#b76a16]"}`}>{isTone ? "声调歌词跟读" : "旋律歌词跟唱"}</div>
          <div className="mt-2 text-xl font-black tracking-[1px] text-[#172132]">正月里是新年哪</div>
        </div>
        <div className="shrink-0 rounded-[8px] border border-[#ded6c8] bg-white/76 px-3 py-2 text-xs font-bold tracking-[1px] text-[#5d6570]">{isTone ? "升降 · 轻重 · 尾音" : "音高 · 节拍 · 连贯"}</div>
      </div>
      <ModernLyricStage mode={mode} activeIndex={lyricIndex} />
      <ModernProgressBar progress={progress} progressLabel={progressLabel} />
      <ModernControls playback={playback} recording={recording} onReplay={onReplay} onTogglePlay={onTogglePlay} onFinish={onFinish} />
    </section>
  );
}

function ModernLyricStage({ mode, activeIndex }: { mode: Mode; activeIndex: number }) {
  const isTone = mode === "tone";
  const toneLine = getCircularItem(tonePracticeLyrics, activeIndex, tonePracticeLyrics[0]);
  const melodyLine = getCircularItem(melodyPracticeLyrics, activeIndex, melodyPracticeLyrics[0]);
  const previousTone = getCircularItem(tonePracticeLyrics, activeIndex - 1, toneLine);
  const nextTone = getCircularItem(tonePracticeLyrics, activeIndex + 1, toneLine);
  const previousMelody = getCircularItem(melodyPracticeLyrics, activeIndex - 1, melodyLine);
  const nextMelody = getCircularItem(melodyPracticeLyrics, activeIndex + 1, melodyLine);
  const currentLyric = isTone ? toneLine.lyric : melodyLine.lyric;
  const previousLyric = isTone ? previousTone.lyric : previousMelody.lyric;
  const nextLyric = isTone ? nextTone.lyric : nextMelody.lyric;
  if (!isTone) {
    return <ModernMelodyStage activeIndex={activeIndex} current={melodyLine} previous={previousMelody} next={nextMelody} previousLyric={previousLyric} nextLyric={nextLyric} />;
  }
  return (
    <div className="grid gap-3 rounded-[8px] border border-[#dfe3ff] bg-[linear-gradient(145deg,rgba(251,252,255,.96),rgba(236,240,255,.78))] p-4">
      <div className="grid grid-cols-[1fr_220px] gap-4">
        <div className="grid gap-3">
          <div key={`tone-prev-${activeIndex}`} className="lyric-prev-in text-center text-base font-bold leading-[1.35] tracking-[1px] text-[#8992a3]/70">{previousLyric}</div>
          <div key={`${mode}-${activeIndex}`} className="lyric-stage-card lyric-focus-in grid min-h-[138px] place-items-center rounded-[8px] border border-white/80 bg-white/90 px-5 py-4 text-center shadow-[0_18px_34px_rgba(31,38,51,.09)]">
            <div className="min-w-0 max-w-full">
              <div className="whitespace-normal break-words text-[34px] font-black leading-[1.12] tracking-[1px] text-[#172132]">{currentLyric}</div>
              <div className="mt-4 whitespace-normal break-words text-sm font-black leading-[1.45] tracking-[1px] text-[#4f57c8]">{toneLine.guide}</div>
            </div>
          </div>
          <div key={`tone-next-${activeIndex}`} className="lyric-next-in text-center text-sm font-bold leading-[1.35] tracking-[1px] text-[#8992a3]/52">{nextLyric}</div>
        </div>
        <ModernScoreBox mode={mode} activeIndex={activeIndex} notation={melodyLine.notation} />
      </div>
      <ToneRelationStrip previous={previousTone} current={toneLine} next={nextTone} />
      <div className="grid gap-4">
        <ModernHintBox label={isTone ? "当前声调提示" : "当前旋律提示"} value={isTone ? toneLine.contour : melodyLine.rhythm} tone={isTone} />
      </div>
    </div>
  );
}

function ModernScoreBox({ mode, activeIndex, notation }: { mode: Mode; activeIndex: number; notation: string }) {
  const isTone = mode === "tone";
  const notationItems = notation.split(/\s+/).filter(Boolean);
  const paths = [
    "M18 144 C82 118 112 72 168 78 C232 86 246 138 322 116",
    "M18 126 C72 152 128 134 174 84 C230 24 282 44 322 78",
    "M18 86 C88 28 132 62 176 112 C230 176 280 152 322 94",
  ];
  const path = getCircularItem(paths, activeIndex, paths[0]);
  return (
    <div className="modern-soft grid min-h-[138px] place-items-center p-4">
      {isTone ? (
        <svg viewBox="0 0 340 190" className="h-full min-h-[118px] w-full text-[#4f57c8]" aria-hidden="true">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          <circle cx="176" cy="112" r="11" fill="#fff" stroke="currentColor" strokeWidth="7" />
          <path d="M18 48 H322M18 96 H322M18 144 H322" stroke="currentColor" strokeWidth="2" opacity=".16" />
        </svg>
      ) : (
        <div className="relative grid h-full min-h-[190px] w-full grid-rows-[1fr_auto] overflow-hidden rounded-[8px] px-2 py-3">
          <div className="absolute inset-x-0 top-[28px] space-y-5">
            {[0, 1, 2, 3, 4].map((line) => <div key={line} className="score-line h-px" />)}
          </div>
          <div className="relative z-10 flex min-h-[118px] flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[clamp(24px,3vw,36px)] font-black leading-none text-[#b76a16]">
            {notationItems.map((item, index) => (
              <span key={`${item}-${index}`} className="min-w-[24px] text-center">{item}</span>
            ))}
          </div>
          <div className="relative z-10 flex flex-wrap justify-center gap-x-7 gap-y-2 text-3xl font-black leading-none text-[#d56906]">
            {notationItems.map((_, index) => (
              <span key={index}>{index % 3 === 1 ? "♩" : "♪"}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ToneRelationStrip({ previous, current, next }: { previous: ToneLine; current: ToneLine; next: ToneLine }) {
  return (
    <div className="rounded-[8px] border border-[#dfe3ff] bg-white/78 p-3">
      <div className="mb-3 text-xs font-black tracking-[2px] text-[#6f78d5]">前后句语调关系</div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
        <ToneRelationNode label="前句" value={previous.contour} muted />
        <RelationArrow tone="tone" />
        <ToneRelationNode label="当前" value={current.contour} />
        <RelationArrow tone="tone" />
        <ToneRelationNode label="后句" value={next.contour} muted />
      </div>
    </div>
  );
}

function ToneRelationNode({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[8px] border px-3 py-2 text-center ${muted ? "border-[#e6e9ff] bg-[#f8f9ff] text-[#6f7890]" : "border-[#cfd5ff] bg-[#eef2ff] text-[#313a9f]"}`}>
      <div className="text-[11px] font-black tracking-[1px]">{label}</div>
      <div className="mt-1 text-[12px] font-bold leading-[1.35]">{value}</div>
    </div>
  );
}

function RelationArrow({ tone }: { tone: "tone" | "melody" }) {
  return (
    <div className={`grid place-items-center px-1 text-lg font-black ${tone === "tone" ? "text-[#5d48d9]" : "text-[#d56906]"}`} aria-hidden="true">→</div>
  );
}

function ModernMelodyStage({ activeIndex, current, previous, next, previousLyric, nextLyric }: { activeIndex: number; current: MelodyLine; previous: MelodyLine; next: MelodyLine; previousLyric: string; nextLyric: string }) {
  const notationItems = current.notation.split(/\s+/).filter(Boolean);
  return (
    <div className="grid gap-3 rounded-[8px] border border-[#f0d9b5] bg-[linear-gradient(145deg,rgba(255,253,247,.98),rgba(255,244,230,.84))] p-4">
      <div key={`melody-stage-${activeIndex}`} className="lyric-stage-card relative min-h-[224px] overflow-hidden rounded-[8px] border border-[#f0d9b5] bg-[#fffaf1] px-6 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.8)]">
        <MelodyLandscape />
        <div className="relative z-10 mx-auto max-w-[760px]">
          <div className="lyric-prev-in text-base font-bold leading-[1.35] tracking-[1px] text-[#6f7890]">{previousLyric}</div>
          <div className="mx-auto mt-3 h-px w-44 bg-[linear-gradient(90deg,transparent,#d9a65c,transparent)]" />
          <div className="lyric-focus-in mt-5 font-serif text-[44px] font-black leading-[1.05] tracking-[1px] text-[#10233c]">{current.lyric}</div>
          <div className="notation-lift mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[28px] font-black leading-none text-[#c56505]">
            {notationItems.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
          <div className="lyric-next-in mt-5 text-lg font-bold leading-[1.35] tracking-[1px] text-[#172132]">{nextLyric}</div>
        </div>
      </div>
      <MelodyRelationStrip previous={previous} current={current} next={next} />
      <div className="rounded-[8px] border border-[#f0d9b5] bg-white/72 p-3">
        <div className="mb-3 flex items-center gap-3 text-base font-black tracking-[1px] text-[#172132]">
          <span className="text-[#c56505]">✣</span>
          旋律提示
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#d7b17a] text-xs text-[#a9773c]">i</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <MelodyTipCard title="音高走向" icon={<MelodyArrowIcon />} body="先上行至高音 1′，再逐步下行。" />
          <MelodyTipCard title="节奏型" icon={<span className="text-4xl leading-none text-[#c56505]">♫</span>} body="前半节奏较舒展，后半收束。" />
          <MelodyTipCard title="演唱提示" icon={<MelodyVoiceIcon />} body="音头清晰，气息连贯自然。" />
        </div>
      </div>
    </div>
  );
}

function MelodyLandscape() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.34]" viewBox="0 0 920 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 240 C70 178 132 204 192 228 C252 252 314 230 374 198 C450 158 520 164 584 205 C652 250 712 235 780 184 C830 146 874 160 920 204 L920 300 L0 300 Z" fill="#dccfbd" />
      <path d="M0 254 C112 220 180 246 254 266 C342 290 430 256 500 220 C590 174 660 196 734 246 C800 290 858 266 920 242 L920 300 L0 300 Z" fill="#eadfcc" />
      <path d="M58 205 C75 158 96 118 112 82M82 184 C106 169 132 170 154 188M76 152 C104 140 128 142 150 158M101 112 C126 102 146 106 166 123" stroke="#c9a46f" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".56" />
      <path d="M724 62 C734 48 751 48 760 62M758 74 C768 60 786 60 796 74M52 82 C61 72 76 72 84 82M86 92 C96 80 112 80 122 92" stroke="#c99a58" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".65" />
      <circle cx="736" cy="98" r="16" fill="#f5bd62" opacity=".58" />
    </svg>
  );
}

function MelodyRelationStrip({ previous, current, next }: { previous: MelodyLine; current: MelodyLine; next: MelodyLine }) {
  return (
    <div className="rounded-[8px] border border-[#f0d9b5] bg-white/78 p-3">
      <div className="mb-3 text-xs font-black tracking-[2px] text-[#c56505]">前后句旋律关系</div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
        <MelodyRelationNode label="前句" value={previous.notation} muted />
        <RelationArrow tone="melody" />
        <MelodyRelationNode label="当前" value={current.notation} />
        <RelationArrow tone="melody" />
        <MelodyRelationNode label="后句" value={next.notation} muted />
      </div>
    </div>
  );
}

function MelodyRelationNode({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[8px] border px-3 py-2 text-center ${muted ? "border-[#f2dfc0] bg-[#fffaf3] text-[#846848]" : "border-[#efc991] bg-[#fff1dc] text-[#b85f05]"}`}>
      <div className="text-[11px] font-black tracking-[1px]">{label}</div>
      <div className="mt-1 whitespace-normal break-words text-[13px] font-black leading-[1.35]">{value}</div>
    </div>
  );
}

function MelodyTipCard({ title, icon, body }: { title: string; icon: React.ReactNode; body: string }) {
  return (
    <div className="rounded-[8px] border border-[#efd7b2] bg-white/78 p-3 shadow-[0_10px_22px_rgba(181,103,22,.06)]">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <div className="text-base font-black leading-[1.25] tracking-[1px] text-[#172132]">{title}</div>
        <div className="h-9 min-w-10 text-[#c56505]">{icon}</div>
      </div>
      <div className="mt-3 border-t border-[#ecd4ae] pt-3 text-xs font-semibold leading-[1.6] tracking-[1px] text-[#33404d]">{body}</div>
    </div>
  );
}

function MelodyArrowIcon() {
  return (
    <svg viewBox="0 0 70 44" className="h-11 w-16" aria-hidden="true">
      <path d="M5 34 C18 24 25 14 39 20 C50 25 55 11 64 7" fill="none" stroke="#c56505" strokeWidth="4" strokeLinecap="round" />
      <path d="M55 6 h10 v10" fill="none" stroke="#c56505" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MelodyVoiceIcon() {
  return (
    <svg viewBox="0 0 54 44" className="h-11 w-14" aria-hidden="true">
      <path d="M10 28a10 10 0 0 0 0-12M18 32a17 17 0 0 0 0-20M27 36a24 24 0 0 0 0-28" fill="none" stroke="#c56505" strokeWidth="4" strokeLinecap="round" />
      <circle cx="8" cy="22" r="4" fill="#c56505" />
    </svg>
  );
}

function ModernHintBox({ label, value, tone }: { label: string; value: string; tone: boolean }) {
  return (
    <div className={`rounded-[8px] border bg-white/82 p-4 ${tone ? "border-[#dfe3ff]" : "border-[#f0d9b5]"}`}>
      <div className="text-sm font-black tracking-[2px] text-[#7e8793]">{label}</div>
      <div className={`mt-3 whitespace-normal break-words text-[26px] font-black leading-[1.3] tracking-[2px] ${tone ? "text-[#313a9f]" : "text-[#b76a16]"}`}>{value}</div>
    </div>
  );
}

function ModernProgressBar({ progress, progressLabel }: { progress: number; progressLabel: string }) {
  return (
    <div className="rounded-[8px] border border-[#e2d8c8] bg-white/72 p-4">
      <div className="relative h-4 overflow-hidden rounded-full bg-[#d9d4ca] shadow-[inset_0_2px_7px_rgba(32,41,54,.18)]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#c51616,#d56906,#4f57c8)] shadow-[0_0_18px_rgba(213,105,6,.24)]" style={{ width: `${clampProgress(progress)}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-3 text-xs font-bold tracking-[.5px] text-[#687181]">
        <span>0:00</span>
        <span className="text-center">本次 {progressLabel}</span>
        <span className="text-right">25:00</span>
      </div>
    </div>
  );
}

function ModernControls({ playback, recording, onReplay, onTogglePlay, onFinish }: { playback: PlaybackState; recording: RecordingState; onReplay: () => void; onTogglePlay: () => void; onFinish: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <ModernControlButton icon={<RotateCcwIcon size={28} strokeWidth={2.1} />} label="重录" onClick={onReplay} />
      <ModernControlButton icon={playback === "playing" ? <PauseIcon size={28} strokeWidth={2.1} /> : <PlayIcon size={28} strokeWidth={2.1} />} label={playback === "playing" ? "暂停" : "开始"} onClick={onTogglePlay} active={playback === "playing"} />
      <button type="button" className={`modern-button min-h-[82px] border border-[#101b2c] bg-[#101b2c] px-3 text-white shadow-[0_16px_32px_rgba(16,27,44,.22)] ${recording === "recording" ? "disc-playing" : "opacity-90"}`} aria-label="结束录音" onClick={onFinish}>
        <div className="flex flex-col items-center justify-center gap-3">
          <DiscIcon size={32} strokeWidth={2.1} />
          <span className="text-sm font-black tracking-[1px]">结束录音</span>
        </div>
      </button>
    </div>
  );
}

function ModernControlButton({ icon, label, onClick, active = false }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" className={`modern-button min-h-[82px] border px-3 ${active ? "border-[#cbd2f4] bg-[#eef2ff] text-[#313a9f]" : "border-[#ded6c8] bg-white/86 text-[#172132]"}`} aria-label={label} onClick={onClick}>
      <div className="flex flex-col items-center justify-center gap-3">
        {icon}
        <span className="text-sm font-black tracking-[1px]">{label}</span>
      </div>
    </button>
  );
}
