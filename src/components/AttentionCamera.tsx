'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function AttentionCamera() {
  const { settings } = useApp();
  const [stream, setStreamState] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeDeviceIdRef = useRef<string>('');

  const setStream = (newStream: MediaStream | null) => {
    streamRef.current = newStream;
    setStreamState(newStream);
  };

  const stopActiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Timer and blink state
  const [lastBlinkTime, setLastBlinkTime] = useState<number>(() => Date.now());
  const [secondsSinceLastBlink, setSecondsSinceLastBlink] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [hasAlertedForCurrentStare, setHasAlertedForCurrentStare] = useState<boolean>(false);
  const [calibrationDiff, setCalibrationDiff] = useState<number>(0);

  // Look Away gaze state
  const [isLookingAway, setIsLookingAway] = useState<boolean>(false);
  const [secondsLookingAway, setSecondsLookingAway] = useState<number>(0);
  const [hasAlertedForLookAway, setHasAlertedForLookAway] = useState<boolean>(false);
  const [forceLookAwaySim, setForceLookAwaySim] = useState<boolean>(false);

  // Video input devices lists
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Pixel calculation refs
  const prevLuminanceLeft = useRef<number>(-1);
  const prevLuminanceRight = useRef<number>(-1);
  const baselineFaceLuminance = useRef<number>(-1);

  // Eye-reticle dimensions on a 160x120 canvas grid
  const eyeLeft = { x: 55, y: 45, w: 18, h: 12 };
  const eyeRight = { x: 87, y: 45, w: 18, h: 12 };
  const blinkThreshold = 2.8; // Luminance change threshold

  // Web Audio warning tone synthesiser for Eye Blinks (High Beep)
  const playBlinkAlertSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const audioCtx = new AudioCtxClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(988, audioCtx.currentTime); // High pitch B5 warning beep
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.error('Failed to play alert sound:', e);
    }
  };

  // Web Audio warning tone synthesiser for Gaze/Look-Away (Double Low Tone)
  const playLookAwayAlertSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const audioCtx = new AudioCtxClass();
      
      const playBeep = (timeOffset: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + timeOffset); // A4 440Hz tone
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeOffset + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(audioCtx.currentTime + timeOffset);
        oscillator.stop(audioCtx.currentTime + timeOffset + 0.25);
      };

      playBeep(0);
      playBeep(0.3);
    } catch (e) {
      console.error('Failed to play look away sound:', e);
    }
  };

  // Dispatch alert to backend API
  const dispatchAdminAlert = async (title: string, text: string, source: string) => {
    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          text,
          type: 'warning',
          region: 'Desktop Client',
          source
        })
      });
      if (res.ok) {
        setAlertsCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to log admin notification:', err);
    }
  };

  // Enumerate connected cameras and pick the built-in laptop webcam if present
  const updateDevicesList = async (deviceIdToSet?: string) => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        if (deviceIdToSet) {
          const exists = videoDevices.some(d => d.deviceId === deviceIdToSet);
          if (exists) {
            setSelectedDeviceId(deviceIdToSet);
            return deviceIdToSet;
          }
        }
        
        // Prioritise built-in laptop cameras and filter out mobile virtual links (droidcam, continuity, etc.)
        const laptopCam = videoDevices.find(d => {
          const label = d.label.toLowerCase();
          const isBuiltIn = label.includes('integrated') || 
                            label.includes('built-in') || 
                            label.includes('hd') || 
                            label.includes('webcam') || 
                            label.includes('internal') || 
                            label.includes('facetime') ||
                            label.includes('camera');
          const isMobileOrVirtual = label.includes('droid') || 
                                    label.includes('iriun') || 
                                    label.includes('epoc') || 
                                    label.includes('continuity') || 
                                    label.includes('virtual') || 
                                    label.includes('phone') || 
                                    label.includes('mobile');
          return isBuiltIn && !isMobileOrVirtual;
        });

        if (laptopCam) {
          setSelectedDeviceId(laptopCam.deviceId);
          return laptopCam.deviceId;
        } else {
          // Fallback to first non-mobile/non-virtual camera
          const nonMobileCam = videoDevices.find(d => {
            const label = d.label.toLowerCase();
            return !label.includes('droid') && !label.includes('iriun') && !label.includes('virtual') && !label.includes('phone') && !label.includes('mobile');
          });
          const targetId = nonMobileCam ? nonMobileCam.deviceId : videoDevices[0].deviceId;
          setSelectedDeviceId(targetId);
          return targetId;
        }
      }
    } catch (e) {
      console.error('Failed to list video devices:', e);
    }
    return '';
  };

  // Start Camera
  const startCamera = async (deviceIdToUse?: string) => {
    setCameraError(null);
    
    // Laptop/PC webcam enforcement - block mobile browsers
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      setCameraError('AI Attention Guard is optimized for Laptop/PC built-in webcams. Mobile cameras are disabled.');
      setIsCameraActive(false);
      return;
    }

    // Stop any existing stream
    stopActiveStream();

    try {
      // First request basic camera access so device labels populate in security model
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      // Update devices list and select standard laptop webcam
      const resolvedId = await updateDevicesList(deviceIdToUse || selectedDeviceId);

      const constraints: MediaStreamConstraints = {
        video: resolvedId 
          ? { deviceId: { exact: resolvedId }, width: 320, height: 240 } 
          : { width: 320, height: 240, facingMode: 'user' }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      activeDeviceIdRef.current = resolvedId || '';
      setLastBlinkTime(Date.now());
      setHasAlertedForCurrentStare(false);
      setSecondsLookingAway(0);
      setHasAlertedForLookAway(false);
      baselineFaceLuminance.current = -1;
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setCameraError('Webcam access blocked or unavailable.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    stopActiveStream();
    setIsCameraActive(false);
    prevLuminanceLeft.current = -1;
    prevLuminanceRight.current = -1;
    baselineFaceLuminance.current = -1;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  // Toggle based on Focus Mode setting
  useEffect(() => {
    if (settings.studyMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [settings.studyMode]);

  // Restart camera when device changes
  useEffect(() => {
    if (isCameraActive && selectedDeviceId) {
      // Check if selectedDeviceId matches the active stream's device ID
      if (activeDeviceIdRef.current === selectedDeviceId) {
        return;
      }
      
      const restart = async () => {
        stopActiveStream();
        try {
          const constraints = {
            video: { deviceId: { exact: selectedDeviceId }, width: 320, height: 240 }
          };
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          activeDeviceIdRef.current = selectedDeviceId;
          baselineFaceLuminance.current = -1;
        } catch (e) {
          console.error('Failed to switch camera device:', e);
        }
      };
      restart();
    }
  }, [selectedDeviceId, isCameraActive]);

  // Handle blink register (either real or simulated)
  const registerBlink = () => {
    setLastBlinkTime(Date.now());
    setIsBlinking(true);
    setHasAlertedForCurrentStare(false);
    setTimeout(() => setIsBlinking(false), 200); // Visual indicator flash duration
  };

  // Main canvas analysis loop
  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) return;

    const analyzeFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Draw video frame onto analyze canvas (160x120)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Function to extract average luminance
        const getAvgLuminance = (x: number, y: number, w: number, h: number) => {
          const imgData = ctx.getImageData(x, y, w, h);
          const data = imgData.data;
          let sum = 0;
          for (let i = 0; i < data.length; i += 4) {
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          return sum / (data.length / 4);
        };

        // 1. Blink Detection
        const currentLumLeft = getAvgLuminance(eyeLeft.x, eyeLeft.y, eyeLeft.w, eyeLeft.h);
        const currentLumRight = getAvgLuminance(eyeRight.x, eyeRight.y, eyeRight.w, eyeRight.h);

        let deltaLeft = 0;
        let deltaRight = 0;

        if (prevLuminanceLeft.current !== -1) {
          deltaLeft = Math.abs(currentLumLeft - prevLuminanceLeft.current);
        }
        if (prevLuminanceRight.current !== -1) {
          deltaRight = Math.abs(currentLumRight - prevLuminanceRight.current);
        }

        const maxDiff = Math.max(deltaLeft, deltaRight);
        setCalibrationDiff(Number(maxDiff.toFixed(1)));

        // If sudden luminance difference spike (eyes closed/blinked)
        if (maxDiff > blinkThreshold && !forceLookAwaySim && !isLookingAway) {
          registerBlink();
        }

        prevLuminanceLeft.current = currentLumLeft;
        prevLuminanceRight.current = currentLumRight;

        // 2. Gaze / Face Position Drift check (Look away detection)
        // Check central head bounding box area (80, 55, w: 60, h: 60)
        const currentCenterLum = getAvgLuminance(50, 25, 60, 60);
        if (baselineFaceLuminance.current === -1) {
          baselineFaceLuminance.current = currentCenterLum;
        } else {
          const luminanceDrift = Math.abs(currentCenterLum - baselineFaceLuminance.current);
          
          // If average luminance inside head boundary shifts by more than 16 units,
          // it indicates the user has shifted their head away or left the frame.
          if (luminanceDrift > 16.0) {
            setIsLookingAway(true);
          } else if (!forceLookAwaySim) {
            setIsLookingAway(false);
          }
        }

        // 3. Draw HUD Overlays onto canvas
        // Circular Face Guide Reticle
        ctx.strokeStyle = isLookingAway ? '#ef4444' : '#006c49';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(80, 55, 38, 0, Math.PI * 2);
        ctx.stroke();

        // Eye tracking bounding boxes
        ctx.strokeStyle = isBlinking ? '#f59e0b' : isLookingAway ? 'rgba(239, 68, 68, 0.4)' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(eyeLeft.x, eyeLeft.y, eyeLeft.w, eyeLeft.h);
        ctx.strokeRect(eyeRight.x, eyeRight.y, eyeRight.w, eyeRight.h);

        // Center crosshair
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(80, 10); ctx.lineTo(80, 110);
        ctx.moveTo(10, 55); ctx.lineTo(150, 55);
        ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(analyzeFrame);
    };

    requestRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isCameraActive, isBlinking, isLookingAway, forceLookAwaySim]);

  // Handle blink-stare warnings (2-second limit)
  useEffect(() => {
    if (!isCameraActive || isLookingAway) return;

    const timer = setInterval(() => {
      const elapsed = (Date.now() - lastBlinkTime) / 1000;
      setSecondsSinceLastBlink(Number(elapsed.toFixed(1)));

      if (elapsed >= 7.0 && !hasAlertedForCurrentStare) {
        setHasAlertedForCurrentStare(true);
        playBlinkAlertSound();
        dispatchAdminAlert(
          'Eye-Blink Attention Alert',
          'Focus warning: Student has not blinked for over 7.0 seconds. Possible eye fatigue.',
          'AI Eye-Blink Monitor'
        );
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isCameraActive, lastBlinkTime, hasAlertedForCurrentStare, isLookingAway]);

  // Handle look-away gaze warnings (10-second limit)
  useEffect(() => {
    if (!isCameraActive) return;

    const timer = setInterval(() => {
      if (isLookingAway || forceLookAwaySim) {
        setSecondsLookingAway(prev => {
          const nextVal = Number((prev + 0.1).toFixed(1));
          if (nextVal >= 10.0 && !hasAlertedForLookAway) {
            setHasAlertedForLookAway(true);
            playLookAwayAlertSound();
            dispatchAdminAlert(
              'Look-Away Attention Alert',
              'Focus warning: Student has been looking away from the screen for over 10.0 seconds.',
              'AI Look-Away Monitor'
            );
          }
          return nextVal;
        });
      } else {
        setSecondsLookingAway(0);
        setHasAlertedForLookAway(false);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [isCameraActive, isLookingAway, forceLookAwaySim, hasAlertedForLookAway]);

  if (!settings.studyMode) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl p-sm text-center">
        <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl mb-1">videocam_off</span>
        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Eye-Blink Tracker Offline</p>
        <p className="text-[9px] text-on-surface-variant/75 mt-0.5">Webcam activates automatically when Focus Mode is turned on.</p>
      </div>
    );
  }

  const isBlinkWarning = secondsSinceLastBlink >= 5.0;
  const isBlinkAlertState = secondsSinceLastBlink >= 7.0;

  const isGazeWarning = secondsLookingAway >= 7.0;
  const isGazeAlertState = secondsLookingAway >= 10.0;

  return (
    <div className={`p-sm rounded-xl border transition-all duration-300 ${
      isBlinkAlertState || isGazeAlertState
        ? 'bg-red-500/10 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.25)]' 
        : isBlinkWarning || isGazeWarning
        ? 'bg-amber-500/5 border-amber-500' 
        : 'bg-white border-outline-variant/30'
    }`}>
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-sm">
        <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-xs">
          <span className={`w-2 h-2 rounded-full inline-block ${isCameraActive ? 'bg-secondary animate-pulse' : 'bg-red-500'}`}></span>
          AI Attention Guard
        </h4>
        <span className="text-[9px] bg-slate-100 text-on-surface-variant px-1.5 py-0.5 rounded font-mono font-bold">
          Alerts: {alertsCount}
        </span>
      </div>

      {/* Video Webcam HUD */}
      {cameraError ? (
        <div className="text-center py-4 bg-slate-50 rounded border border-red-200/30">
          <span className="material-symbols-outlined text-red-500 text-xl font-bold">error</span>
          <p className="text-[9px] text-red-600 font-bold mt-1">{cameraError}</p>
          <button 
            onClick={() => startCamera()} 
            className="mt-2 px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-950 shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-60 scale-x-[-1]"
          />
          <canvas
            ref={canvasRef}
            width={160}
            height={120}
            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          />
          
          {isBlinking && !isLookingAway && (
            <div className="absolute inset-0 bg-secondary/15 flex items-center justify-center z-25 pointer-events-none">
              <span className="bg-secondary text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-ping">
                Blink!
              </span>
            </div>
          )}

          {isLookingAway && (
            <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center z-25 pointer-events-none">
              <span className="bg-red-600 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider">
                Gaze Warning
              </span>
            </div>
          )}
          
          {isBlinkAlertState && !isLookingAway && (
            <div className="absolute inset-0 bg-red-600/20 flex flex-col items-center justify-center z-25 pointer-events-none">
              <span className="bg-red-600 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider animate-bounce">
                ATTENTION ALERT SENT
              </span>
            </div>
          )}

          {isGazeAlertState && (
            <div className="absolute inset-0 bg-red-600/30 flex flex-col items-center justify-center z-25 pointer-events-none">
              <span className="bg-red-600 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider animate-bounce">
                LOOK AWAY ALERT SENT
              </span>
            </div>
          )}
        </div>
      )}

      {/* Control Details and Timers */}
      <div className="mt-sm space-y-sm">
        
        {/* Blink gauge */}
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-[9px] font-semibold text-on-surface-variant">
            <span>Stare Duration:</span>
            <span className={`font-mono font-bold ${isBlinkAlertState ? 'text-red-600' : isBlinkWarning ? 'text-amber-500' : 'text-primary'}`}>
              {secondsSinceLastBlink}s / 7.0s
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${
                isBlinkAlertState ? 'bg-red-500' : isBlinkWarning ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${isLookingAway ? 0 : Math.min(100, (secondsSinceLastBlink / 7.0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Gaze Look Away gauge */}
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-[9px] font-semibold text-on-surface-variant">
            <span>Gaze Status:</span>
            <span className={`font-mono font-bold flex items-center gap-1 ${isLookingAway ? 'text-red-500' : 'text-secondary'}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${isLookingAway ? 'bg-red-500 animate-pulse' : 'bg-secondary'}`}></span>
              {isLookingAway ? `Looking Away (${secondsLookingAway}s / 10s)` : 'Looking at Screen'}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${
                isGazeAlertState ? 'bg-red-500' : isGazeWarning ? 'bg-amber-500' : 'bg-secondary'
              }`}
              style={{ width: `${Math.min(100, (secondsLookingAway / 10.0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Camera Selector Dropdown */}
        {devices.length > 0 && (
          <div className="space-y-xs">
            <div className="flex items-center justify-between text-[9px] font-semibold text-on-surface-variant">
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                Webcam Input Source:
              </span>
            </div>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full text-[10px] bg-slate-50 dark:bg-slate-900 border border-outline-variant/30 rounded px-2 py-1.5 text-on-surface-variant font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-white dark:bg-slate-900">
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Debug Metrics */}
        <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold font-mono">
          <span>EYE DELTA: {calibrationDiff}</span>
          <span>THRESHOLD: {blinkThreshold}</span>
        </div>

        {/* Simulator controls */}
        <div className="pt-xs flex flex-col gap-xs">
          <div className="flex gap-xs">
            <button
              onClick={registerBlink}
              disabled={isLookingAway}
              className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                isLookingAway 
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-surface-container-high hover:bg-surface-variant border-outline-variant/30 text-primary'
              }`}
            >
              Simulate Blink
            </button>
            <button
              onClick={() => {
                const nextVal = !forceLookAwaySim;
                setForceLookAwaySim(nextVal);
                setIsLookingAway(nextVal);
              }}
              className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                forceLookAwaySim 
                  ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' 
                  : 'bg-surface-container-high hover:bg-surface-variant border-outline-variant/30 text-primary'
              }`}
            >
              {forceLookAwaySim ? 'Stop Look-Away' : 'Simulate Look-Away'}
            </button>
          </div>
          
          {!isCameraActive && (
            <button
              onClick={() => startCamera()}
              className="w-full py-1 bg-primary text-white rounded text-[9px] font-bold cursor-pointer"
            >
              Start Camera
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
