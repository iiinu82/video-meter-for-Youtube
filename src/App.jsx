import { useRef, useState, useEffect } from "react";
import "./App.css";

function App() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  const [videoId, setVideoId] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [count, setCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [memo, setMemo] = useState("");
  const [startScore, setStartScore] = useState("");
  const [endScore, setEndScore] = useState("");
  const [isSeeking, setIsSeeking] = useState(false);

  // YouTube URL から動画IDを抽出
  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleUrlSubmit = () => {
    const id = extractVideoId(urlInput.trim());
    if (id) {
      setVideoId(id);
      setVideoName(id);
    } else {
      alert("YouTubeのURLを正しく入力してください");
    }
  };

  // YouTube IFrame API の読み込みとプレーヤー初期化
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {}
      playerRef.current = null;
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            setPlayerReady(true);
            setDuration(event.target.getDuration());
            setEndTime(event.target.getDuration());
          },
          onStateChange: (event) => {
            if (event.data === 1) setIsPlaying(true);
            else if (event.data === 2 || event.data === 0) setIsPlaying(false);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById("youtube-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      setPlayerReady(false);
    };
  }, [videoId]);

  // currentTime をポーリング
  useEffect(() => {
    if (!playerReady) return;
    intervalRef.current = setInterval(() => {
      if (isSeeking) return; // ドラッグ中はスキップ
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const t = playerRef.current.getCurrentTime();
        if (typeof t === "number") setCurrentTime(t);
        const d = playerRef.current.getDuration();
        if (typeof d === "number" && d > 0) setDuration(d);
      }
    }, 250);
    return () => clearInterval(intervalRef.current);
  }, [playerReady, isSeeking]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (seconds) => {
    if (!playerRef.current) return;
    const cur = playerRef.current.getCurrentTime();
    const dur = playerRef.current.getDuration();
    const newTime = Math.max(0, Math.min(dur, cur + seconds));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleSpeed = (speed) => {
    if (!playerRef.current) return;
    playerRef.current.setPlaybackRate(speed);
    setPlaybackRate(speed);
  };

  const handleMuteToggle = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handlePickStart = () => {
    if (playerRef.current) setStartTime(playerRef.current.getCurrentTime());
  };

  const handlePickEnd = () => {
    if (playerRef.current) setEndTime(playerRef.current.getCurrentTime());
  };

  const handleMove = (time) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="movieArea">
        <div
          className="urlInputArea"
          style={{ marginBottom: 8, display: "flex", gap: 8 }}
        >
          <input
            type="text"
            placeholder="YouTubeのURLを貼り付け"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleUrlSubmit}>読み込み</button>
        </div>

        <div className="movieScreen">
          <div ref={containerRef} />
        </div>

        <div className="seekBar">
          <span>{formatTime(currentTime)}</span>

          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onTouchEnd={() => setIsSeeking(false)}
            onChange={(e) => {
              const time = Number(e.target.value);
              setCurrentTime(time);
            }}
            onMouseUpCapture={() => {
              if (playerRef.current)
                playerRef.current.seekTo(currentTime, true);
              setIsSeeking(false);
            }}
            onTouchEndCapture={() => {
              if (playerRef.current)
                playerRef.current.seekTo(currentTime, true);
              setIsSeeking(false);
            }}
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="seekButtonArea">
          <button className="seekButton" onClick={() => handleSeek(-60)}>
            -60
          </button>
          <button className="seekButton" onClick={() => handleSeek(-10)}>
            -10
          </button>
          <button className="seekButton" onClick={() => handleSeek(-3)}>
            -3
          </button>
          <button className="seekButtonF" onClick={() => handleSeek(+3)}>
            +3
          </button>
          <button className="seekButtonF" onClick={() => handleSeek(+10)}>
            +10
          </button>
          <button className="seekButtonF" onClick={() => handleSeek(+60)}>
            +60
          </button>
        </div>

        <div className="speedButtonArea">
          <button className="playPauseButton" onClick={handlePlayPause}>
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          {[0.5, 0.75, 1.0, 1.25, 1.5].map((s) => (
            <button
              key={s}
              className={`speedButton ${playbackRate === s ? "selected" : ""}`}
              onClick={() => handleSpeed(s)}
            >
              {s}
            </button>
          ))}
          <button className="muteButton" onClick={handleMuteToggle}>
            {isMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      <div className="timeArea">
        <div className="startTime">
          <p>🚩</p>
          <input
            type="text"
            name="start"
            id="start"
            value={formatTime(startTime)}
            readOnly
          />
          <button className="pick" onClick={handlePickStart}>
            記録
          </button>
          <button className="move" onClick={() => handleMove(startTime)}>
            移動
          </button>
          S
          <input
            className="inputScore"
            type="number"
            name="startScore"
            value={startScore}
            onChange={(e) => setStartScore(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="endTime">
          <p>🏁</p>
          <input
            type="text"
            name="end"
            id="end"
            value={formatTime(endTime)}
            readOnly
          />
          <button className="pick" onClick={handlePickEnd}>
            記録
          </button>
          <button className="move" onClick={() => handleMove(endTime)}>
            移動
          </button>
          S
          <input
            className="inputScore"
            type="number"
            name="endScore"
            value={endScore}
            onChange={(e) => setEndScore(e.target.value)}
          />
        </div>
        <div className="bottomArea">
          <div className="leftBottomArea">
            <button onClick={() => setCount((c) => c + 1)}>{count}</button>
            <p className="freeCount">COUNT</p>
            <button className="resetButton" onClick={() => setCount(0)}>
              リセット
            </button>
          </div>
          <div className="rightBottomArea">
            <div className="elapsed-score">
              <div className="elapsedTime">
                経過時間：
                {endTime >= startTime ? formatTime(endTime - startTime) : "--"}
              </div>
              <div className="score">
                <span>スコア: </span>
                <span className="score">{endScore - startScore}</span>
              </div>
            </div>
            <div className="scorePerMinuteSaveButtonArea">
              <div className="scorePerMinute">
                <span>
                  {endTime > startTime
                    ? Math.floor(
                        ((endScore - startScore) / (endTime - startTime)) * 60,
                      )
                    : "0"}{" "}
                  / 分
                </span>
              </div>
              <button className="saveScreen" onClick={() => setShowModal(true)}>
                保存用画面
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="memoArea">
        <div className="topArea">
          <p>メモ📋️</p>
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        ></textarea>
      </div>

      {showModal && (
        <div className="modalOverlay">
          <div className="modalContent">
            <p>{videoName}</p>
            <div className="flexbox">
              <p>
                開始時間<span>{formatTime(startTime)}</span>
              </p>
              <p>
                終了時間<span>{formatTime(endTime)}</span>
              </p>
            </div>
            <div className="flexbox">
              <p>
                経過時間
                <span>
                  {endTime >= startTime
                    ? formatTime(endTime - startTime)
                    : "--"}
                </span>
              </p>
              <p>
                スコア<span>{endScore - startScore}</span>
              </p>
            </div>
            <p>
              スコア効率
              <span>
                {endTime > startTime
                  ? Math.floor(
                      ((endScore - startScore) / (endTime - startTime)) * 60,
                    )
                  : 0}
                /m
              </span>
            </p>
            <div className="modalMemo">
              <p>📋️メモ</p>
              {memo}
            </div>
            <button onClick={() => setShowModal(false)}>✕</button>
          </div>
        </div>
      )}
      <footer>
        <small>© 2026 T.Kawakatsu · VideoMeter YouTube Edition</small>
      </footer>
    </>
  );
}

export default App;
