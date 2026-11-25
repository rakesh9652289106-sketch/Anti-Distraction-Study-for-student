'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function AttentionCamera() {
  const { settings, isTimerRunning, activeRoom, updateSettings, startTimer } = useApp();
  const [manualCheckActive, setManualCheckActive] = useState<boolean>(false);

  const aiCfg = settings?.aiConfig as any;
  const sensitivity = aiCfg?.attentionGuardSensitivity || 'medium';

  // 1. Stare Duration Alert Limit (Configured: 1 to 10 seconds)
  const stareDurationLimit = Math.max(1, Math.min(10, Number(aiCfg?.stareDurationLimit) || 7));
  const stareWarningThreshold = Math.max(1, Math.round(stareDurationLimit * 0.7));
  const stareDurationLimitRef = useRef(7);
  useEffect(() => {
    stareDurationLimitRef.current = stareDurationLimit;
  }, [stareDurationLimit]);

  // 2. Gaze Status Alert Threshold (Configured: 10s, 30s, or 60s)
  const gazeStatusThreshold = Number(aiCfg?.gazeStatusDuration) || (sensitivity === 'high' ? 10 : sensitivity === 'low' ? 60 : 30);
  const gazeStatusThresholdRef = useRef(10);
  useEffect(() => {
    gazeStatusThresholdRef.current = gazeStatusThreshold;
  }, [gazeStatusThreshold]);

  // 3. Look at Screen Alert Threshold (Configured: 10s, 30s, or 60s)
  const lookAwayThreshold = Number(aiCfg?.lookAtScreenDuration) || (sensitivity === 'high' ? 10 : sensitivity === 'low' ? 60 : 30);
  const gazeWarningThreshold = Math.max(2, Math.round(lookAwayThreshold * 0.7));
  const lookAwayThresholdRef = useRef(10);
  useEffect(() => {
    lookAwayThresholdRef.current = lookAwayThreshold;
  }, [lookAwayThreshold]);

  const [streamState, setStreamState] = useState<MediaStream | null>(null);
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
  const [secondsSinceLastBlink, setSecondsSinceLastBlink] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [calibrationDiff, setCalibrationDiff] = useState<number>(0);

  // Look Away gaze state
  const [isLookingAway, setIsLookingAway] = useState<boolean>(false);
  const [secondsLookingAway, setSecondsLookingAway] = useState<number>(0);
  const [faceAsymmetry, setFaceAsymmetry] = useState<number>(0);
  const [faceSlant, setFaceSlant] = useState<number>(0);
  const [driftX, setDriftX] = useState<number>(0);
  const [driftY, setDriftY] = useState<number>(0);
  const [liveSkinCount, setLiveSkinCount] = useState<number>(0);
  const [baseSkinCount, setBaseSkinCount] = useState<number>(0);
  const [calibColor, setCalibColor] = useState<string>('N/A');

  // Specific Gaze Error Reasons
  const [activeGazeError, setActiveGazeError] = useState<
    'none' | 'multi_person' | 'face_missing' | 'side_view' | 'drift_off_center' | 'head_slanted' | 'face_occluded'
  >('none');
  const activeGazeErrorRef = useRef<
    'none' | 'multi_person' | 'face_missing' | 'side_view' | 'drift_off_center' | 'head_slanted' | 'face_occluded'
  >('none');

  // Progressive multi-frame calibration accumulator
  const calibFrameCountRef = useRef<number>(0);
  const calibAccumCenterX = useRef<number>(0);
  const calibAccumCenterY = useRef<number>(0);
  const calibAccumSkinCount = useRef<number>(0);

  // Warning modal states for student attention UI alerts (3 distinct alert systems)
  const [showMultiPersonAlertModal, setShowMultiPersonAlertModal] = useState<boolean>(false);
  const [showLookAwayAlertModal, setShowLookAwayAlertModal] = useState<boolean>(false);
  const [showBlinkAlertModal, setShowBlinkAlertModal] = useState<boolean>(false);

  // Multi-person detection state (Policy: Only 1 member in frame, alert < 5s)
  const [multiPersonDetected, setMultiPersonDetected] = useState<boolean>(false);
  const [secondsMultiPerson, setSecondsMultiPerson] = useState<number>(0);
  const multiPersonDetectedRef = useRef<boolean>(false);
  const hasAlertedForMultiPersonRef = useRef<boolean>(false);
  const multiPersonCountRef = useRef<number>(0);

  // Helper to get human-readable details for the active error
  const getGazeErrorDetails = (reason: string) => {
    switch (reason) {
      case 'multi_person':
        return {
          title: 'Security Alert: Only 1 Member Allowed',
          label: 'Multiple Members in Frame (Security Violation)',
          badgeColor: 'bg-orange-600 text-white',
          description: 'Another person entered the camera frame. Policy strictly allows only 1 registered member in view.',
          resolution: 'Ensure all other individuals step out of the camera view immediately (Alert fires within 5s).',
          shortCode: 'ERR: ONLY 1 MEMBER ALLOWED'
        };
      case 'face_missing':
        return {
          title: 'Face Not Detected Error',
          label: 'Face Out of Frame (No Face)',
          badgeColor: 'bg-red-500 text-white',
          description: 'No face detected in camera. Please face the screen and ensure good room lighting.',
          resolution: 'Position your face centrally in front of your webcam.',
          shortCode: 'ERR: NO FACE IN CAMERA VIEW'
        };
      case 'side_view':
        return {
          title: 'Face Turned Away (Gaze Diverted)',
          label: 'Face Turned Away (Gaze Error)',
          badgeColor: 'bg-red-600 text-white',
          description: 'Your face is turned away from the screen. Gaze must remain focused on the monitor.',
          resolution: 'Turn your face forward and look directly at your monitor.',
          shortCode: 'ERR: FACE TURNED AWAY'
        };
      case 'drift_off_center':
        return {
          title: 'Head Position Drift Error',
          label: 'Head Drifted Off-Center',
          badgeColor: 'bg-amber-500 text-white',
          description: 'Your head drifted too far from the screen center. Please realign with your webcam.',
          resolution: 'Center yourself in front of your webcam and sit upright.',
          shortCode: 'ERR: HEAD OFF-CENTER'
        };
      case 'head_slanted':
        return {
          title: 'Head Slant Error Detected',
          label: 'Severe Head Tilt / Slant',
          badgeColor: 'bg-amber-500 text-white',
          description: 'Severe head tilt detected. Maintain an upright, alert posture facing the monitor.',
          resolution: 'Keep your head straight and level with your screen.',
          shortCode: 'ERR: EXCESSIVE HEAD TILT'
        };
      case 'face_occluded':
        return {
          title: 'Face Occlusion Error',
          label: 'Face Partially Covered',
          badgeColor: 'bg-amber-500 text-white',
          description: 'Your face is partially covered or obscured. Keep your face clear of obstacles.',
          resolution: 'Remove hands, hair, or objects covering your face and eyes.',
          shortCode: 'ERR: FACE OCCLUDED / COVERED'
        };
      default:
        return {
          title: 'Gaze Aligned',
          label: 'Looking at Screen (Focus OK)',
          badgeColor: 'bg-emerald-600 text-white',
          description: 'Student is looking directly at the workspace screen with normal gaze alignment.',
          resolution: 'Gaze is centered. Keep focused on your study material.',
          shortCode: 'GAZE OK: SCREEN ALIGNED'
        };
    }
  };

  // Video input devices lists
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Running average luminance refs for adaptive blink detection (DSP baseline filter)
  const avgLuminanceLeft = useRef<number>(-1);
  const avgLuminanceRight = useRef<number>(-1);
  
  // Centroid tracking refs for head movement filtering
  const prevCenterX = useRef<number>(80);
  const prevCenterY = useRef<number>(55);

  // Baseline face tracking calibration refs for unblocked look-away detection
  const baselineCenterX = useRef<number>(-1);
  const baselineCenterY = useRef<number>(-1);
  const baselineSkinCount = useRef<number>(-1);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [isSideViewing, setIsSideViewing] = useState<boolean>(false);

  // Dynamic color calibration refs
  const calibratedR = useRef<number>(-1);
  const calibratedG = useRef<number>(-1);
  const calibratedB = useRef<number>(-1);
  const needsColorCalibration = useRef<boolean>(true);

  // Dynamic eye locations stored in refs to avoid high-frequency React re-renders
  const eyeLeftRef = useRef({ x: 55, y: 45, w: 14, h: 10 });
  const eyeRightRef = useRef({ x: 87, y: 45, w: 14, h: 10 });
  const pupilLeftRef = useRef({ x: 62, y: 50 });
  const pupilRightRef = useRef({ x: 94, y: 50 });
  const [gazeAlignment, setGazeAlignment] = useState<number>(100);
  
  const blinkThreshold = 1.6; // Adjusted luminance change threshold for dynamic tracking

  // Refs for tracking values inside async loops & timers
  const isLookingAwayRef = useRef<boolean>(false);
  const isAsymmetricActiveRef = useRef<boolean>(false);
  const isBlinkingRef = useRef<boolean>(false);
  const lastBlinkTimeRef = useRef<number>(0);
  const hasAlertedForCurrentStareRef = useRef<boolean>(false);
  const hasAlertedForLookAwayRef = useRef<boolean>(false);

  // Hysteresis frame counts
  const faceAbsentCountRef = useRef<number>(0);
  const facePresentCountRef = useRef<number>(0);

  // Keep activeRoom in sync via ref to avoid resetting timer
  const activeRoomRef = useRef<any>(null);
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

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

  // Web Audio warning tone for Multi-Person Detection (Urgent Triple Beep)
  const playMultiPersonAlertSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const audioCtx = new AudioCtxClass();
      
      const playBeep = (timeOffset: number, freq: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + timeOffset);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + timeOffset);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeOffset + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(audioCtx.currentTime + timeOffset);
        oscillator.stop(audioCtx.currentTime + timeOffset + 0.2);
      };

      playBeep(0, 660);
      playBeep(0.22, 880);
      playBeep(0.44, 1100);
    } catch (e) {
      console.error('Failed to play multi-person alert sound:', e);
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

  // Reset all calibration and tracking states cleanly
  const resetCalibrationValues = () => {
    prevCenterX.current = 80;
    prevCenterY.current = 55;
    baselineCenterX.current = -1;
    baselineCenterY.current = -1;
    baselineSkinCount.current = -1;
    calibFrameCountRef.current = 0;
    calibAccumCenterX.current = 0;
    calibAccumCenterY.current = 0;
    calibAccumSkinCount.current = 0;
    setIsCalibrated(false);
    multiPersonCountRef.current = 0;
    multiPersonDetectedRef.current = false;
    setMultiPersonDetected(false);
    activeGazeErrorRef.current = 'none';
    setActiveGazeError('none');
    setFaceAsymmetry(0);
    setFaceSlant(0);
    setDriftX(0);
    setDriftY(0);
    setLiveSkinCount(0);
    setBaseSkinCount(0);
    setGazeAlignment(100);
    pupilLeftRef.current = { x: 62, y: 50 };
    pupilRightRef.current = { x: 94, y: 50 };
    calibratedR.current = -1;
    calibratedG.current = -1;
    calibratedB.current = -1;
    needsColorCalibration.current = true;
    setCalibColor('N/A');
    setSecondsLookingAway(0);
    setSecondsMultiPerson(0);
    hasAlertedForLookAwayRef.current = false;
    hasAlertedForMultiPersonRef.current = false;
    setIsLookingAway(false);
    isLookingAwayRef.current = false;
    setIsSideViewing(false);
    setShowMultiPersonAlertModal(false);
    setShowLookAwayAlertModal(false);
    setShowBlinkAlertModal(false);
    faceAbsentCountRef.current = 0;
    facePresentCountRef.current = 0;
  };

  // Start Camera
  const startCamera = async (deviceIdToUse?: string) => {
    if (settings?.cameraEnabled === false) {
      console.warn('Camera is disabled by administrator');
      return;
    }
    setCameraError(null);

    // Stop any existing stream
    stopActiveStream();

    try {
      let mediaStream: MediaStream | null = null;
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());

        // Update devices list
        const resolvedId = await updateDevicesList(deviceIdToUse || selectedDeviceId);

        const constraints: MediaStreamConstraints = {
          video: resolvedId 
            ? { deviceId: resolvedId, width: { ideal: 320 }, height: { ideal: 240 } } 
            : { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintErr) {
        console.warn('Constrained camera acquisition failed, falling back to basic video:', constraintErr);
        // Fallback to generic webcam stream
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      activeDeviceIdRef.current = selectedDeviceId || '';
      lastBlinkTimeRef.current = Date.now();
      hasAlertedForCurrentStareRef.current = false;
      setIsBlinking(false);
      isBlinkingRef.current = false;
      resetCalibrationValues();
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setCameraError('Webcam access blocked or unavailable. Please allow camera permissions in your browser.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    stopActiveStream();
    setIsCameraActive(false);
    avgLuminanceLeft.current = -1;
    avgLuminanceRight.current = -1;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  // Active when camera is enabled by admin AND (Study Mode + Timer is on, OR when manual test check is running)
  const isCameraAllowed = settings?.cameraEnabled !== false;
  const shouldBeActive = isCameraAllowed && ((settings?.studyMode && isTimerRunning) || manualCheckActive);

  // Stop camera immediately if camera is disabled by admin
  useEffect(() => {
    if (settings?.cameraEnabled === false) {
      setManualCheckActive(false);
      stopCamera();
    }
  }, [settings?.cameraEnabled]);

  // Toggle based on Focus Mode setting or manual check
  useEffect(() => {
    if (shouldBeActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldBeActive]);

  // Ensure stream is bound to video element as soon as video element is mounted
  useEffect(() => {
    const activeStream = streamState || streamRef.current;
    if (videoRef.current && activeStream) {
      if (videoRef.current.srcObject !== activeStream) {
        videoRef.current.srcObject = activeStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [streamState, isCameraActive, shouldBeActive]);

  // Restart camera when device changes
  useEffect(() => {
    if (settings?.cameraEnabled === false) return;
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
          resetCalibrationValues();
        } catch (e) {
          console.error('Failed to switch camera device:', e);
        }
      };
      restart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, isCameraActive]);

  // Handle blink register (either real or simulated)
  const registerBlink = () => {
    const now = Date.now();
    lastBlinkTimeRef.current = now;
    setIsBlinking(true);
    isBlinkingRef.current = true;
    hasAlertedForCurrentStareRef.current = false;
    setTimeout(() => {
      setIsBlinking(false);
      isBlinkingRef.current = false;
    }, 200); // Visual indicator flash duration
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

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Skin color centroid detection (Universal multi-spectrum face & gaze tracking)
        let skinCount = 0;
        let skinCountLeft = 0;
        let skinCountRight = 0;
        let skinCountLeftThird = 0;
        let skinCountMiddleThird = 0;
        let skinCountRightThird = 0;
        let skinCountTL = 0;
        let skinCountTR = 0;
        let skinCountBL = 0;
        let skinCountBR = 0;
        let sumX = 0;
        let sumY = 0;
        let sumSkinR = 0;
        let sumSkinG = 0;
        let sumSkinB = 0;
        let minSkinX = 999;
        let maxSkinX = -1;
        let minSkinY = 999;
        let maxSkinY = -1;

        // Expanded search loop to cover full webcam frame for face tracking and peripheral detection
        for (let y = 8; y < canvas.height - 8; y += 2) {
          for (let x = 8; x < canvas.width - 8; x += 2) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Multi-spectrum color space conversion (YCbCr + normalized RGB)
            const yLum = 0.299 * r + 0.587 * g + 0.114 * b;
            const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

            // Universal skin cluster detection (invariant to lighting & ethnicity)
            const isSkinYCbCr = cr >= 132 && cr <= 175 && cb >= 77 && cb <= 135 && yLum > 30;
            const isSkinRGB = r > 45 && g > 28 && b > 16 && r > g && r > b && (r - g) >= 7 && (r - b) >= 9 && (r + g + b) > 95;
            let isSkin = isSkinYCbCr || isSkinRGB;

            if (calibratedR.current !== -1) {
              const diffR = Math.abs(r - calibratedR.current);
              const diffG = Math.abs(g - calibratedG.current);
              const diffB = Math.abs(b - calibratedB.current);
              if (diffR < 48 && diffG < 48 && diffB < 48 && yLum > 30) {
                isSkin = true;
              }
            }

            if (isSkin) {
              skinCount++;
              sumX += x;
              sumY += y;
              sumSkinR += r;
              sumSkinG += g;
              sumSkinB += b;

              if (x < minSkinX) minSkinX = x;
              if (x > maxSkinX) maxSkinX = x;
              if (y < minSkinY) minSkinY = y;
              if (y > maxSkinY) maxSkinY = y;

              if (x < 55) {
                skinCountLeftThird++;
              } else if (x <= 105) {
                skinCountMiddleThird++;
              } else {
                skinCountRightThird++;
              }
              
              if (x < prevCenterX.current) {
                skinCountLeft++;
                if (y < prevCenterY.current) {
                  skinCountTL++;
                } else if (y > prevCenterY.current) {
                  skinCountBL++;
                }
              } else if (x > prevCenterX.current) {
                skinCountRight++;
                if (y < prevCenterY.current) {
                  skinCountTR++;
                } else if (y > prevCenterY.current) {
                  skinCountBR++;
                }
              }
            }
          }
        }

        const isFacePresent = skinCount >= 28;
        let centerX = 80;
        let centerY = 55;
        let headShift = 0;

        // Perform automatic skin color calibration once face is stably in view
        if (isFacePresent && needsColorCalibration.current && skinCount >= 50) {
          calibratedR.current = Math.round(sumSkinR / skinCount);
          calibratedG.current = Math.round(sumSkinG / skinCount);
          calibratedB.current = Math.round(sumSkinB / skinCount);
          needsColorCalibration.current = false;
          setCalibColor(`${calibratedR.current},${calibratedG.current},${calibratedB.current}`);
        }

        // Feed live variables to React states for HUD debug display
        setLiveSkinCount(skinCount);
        if (baselineSkinCount.current !== -1) {
          setBaseSkinCount(Math.round(baselineSkinCount.current));
        } else {
          setBaseSkinCount(0);
        }

        if (isFacePresent) {
          centerX = sumX / skinCount;
          centerY = sumY / skinCount;

          // Progressive multi-frame calibration: accumulate 18 frames so baseline is accurate
          if (!isCalibrated) {
            calibFrameCountRef.current += 1;
            calibAccumCenterX.current += centerX;
            calibAccumCenterY.current += centerY;
            calibAccumSkinCount.current += skinCount;

            if (calibFrameCountRef.current >= 18) {
              baselineCenterX.current = calibAccumCenterX.current / 18;
              baselineCenterY.current = calibAccumCenterY.current / 18;
              baselineSkinCount.current = Math.max(60, calibAccumSkinCount.current / 18);
              setIsCalibrated(true);
            }
          }

          // Smooth centroid to reduce jitter (exponential moving average)
          const smoothFactor = 0.12;
          const finalX = prevCenterX.current + (centerX - prevCenterX.current) * smoothFactor;
          const finalY = prevCenterY.current + (centerY - prevCenterY.current) * smoothFactor;

          // Compute absolute distance shifted this frame
          headShift = Math.sqrt(
            Math.pow(finalX - prevCenterX.current, 2) + 
            Math.pow(finalY - prevCenterY.current, 2)
          );

          prevCenterX.current = finalX;
          prevCenterY.current = finalY;

          // Gently adapt baseline when student is looking at screen and relatively stable
          if (baselineCenterX.current !== -1 && isCalibrated) {
            const dx = Math.abs(finalX - baselineCenterX.current);
            const dy = Math.abs(finalY - baselineCenterY.current);
            if (!isLookingAwayRef.current && !multiPersonDetectedRef.current && headShift < 1.2 && dx < 20 && dy < 16) {
              baselineCenterX.current = baselineCenterX.current * 0.99 + finalX * 0.01;
              baselineCenterY.current = baselineCenterY.current * 0.99 + finalY * 0.01;
              baselineSkinCount.current = baselineSkinCount.current * 0.99 + skinCount * 0.01;
            }
          }

          // Dynamically adjust eye box coordinates relative to face centroid
          eyeLeftRef.current = {
            x: Math.round(Math.max(4, Math.min(142, finalX - 22))),
            y: Math.round(Math.max(4, Math.min(106, finalY - 10))),
            w: 14,
            h: 10
          };
          eyeRightRef.current = {
            x: Math.round(Math.max(4, Math.min(142, finalX + 8))),
            y: Math.round(Math.max(4, Math.min(106, finalY - 10))),
            w: 14,
            h: 10
          };

          // Active Iris / Pupil Gaze Tracking:
          // Find lowest luminance (darkest spot) inside left and right eye boxes
          let minLumL = 255;
          let pXL = eyeLeftRef.current.x + 7;
          let pYL = eyeLeftRef.current.y + 5;
          for (let ey = eyeLeftRef.current.y + 1; ey < eyeLeftRef.current.y + eyeLeftRef.current.h - 1; ey++) {
            for (let ex = eyeLeftRef.current.x + 1; ex < eyeLeftRef.current.x + eyeLeftRef.current.w - 1; ex++) {
              const idx = (ey * canvas.width + ex) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < minLumL) {
                minLumL = lum;
                pXL = ex;
                pYL = ey;
              }
            }
          }

          let minLumR = 255;
          let pXR = eyeRightRef.current.x + 7;
          let pYR = eyeRightRef.current.y + 5;
          for (let ey = eyeRightRef.current.y + 1; ey < eyeRightRef.current.y + eyeRightRef.current.h - 1; ey++) {
            for (let ex = eyeRightRef.current.x + 1; ex < eyeRightRef.current.x + eyeRightRef.current.w - 1; ex++) {
              const idx = (ey * canvas.width + ex) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < minLumR) {
                minLumR = lum;
                pXR = ex;
                pYR = ey;
              }
            }
          }

          // Smooth pupil centroid coordinates
          pupilLeftRef.current = {
            x: pupilLeftRef.current.x * 0.65 + pXL * 0.35,
            y: pupilLeftRef.current.y * 0.65 + pYL * 0.35
          };
          pupilRightRef.current = {
            x: pupilRightRef.current.x * 0.65 + pXR * 0.35,
            y: pupilRightRef.current.y * 0.65 + pYR * 0.35
          };
        }

        // Multi-person detection:
        // Checked strictly only AFTER calibration is established to avoid false positives during camera boot.
        // Ensures only 1 member is in the frame. If anyone else enters, triggers an alert within 5 seconds.
        const faceWidth = maxSkinX >= minSkinX ? (maxSkinX - minSkinX) : 0;
        let rawMultiPerson = false;
        if (isCalibrated && baselineSkinCount.current >= 45) {
          // Rule 1: Left third + Middle third (2 people: registered student + someone entering from left)
          const isLeftAndMiddle = skinCountLeftThird >= 24 && skinCountMiddleThird >= 30 && faceWidth >= 70;
          // Rule 2: Right third + Middle third (2 people: registered student + someone entering from right)
          const isRightAndMiddle = skinCountRightThird >= 24 && skinCountMiddleThird >= 30 && faceWidth >= 70;
          // Rule 3: Left third + Right third (2 people spaced on sides of frame)
          const isDualClusters = skinCountLeftThird >= 22 && skinCountRightThird >= 22 && faceWidth >= 74;
          // Rule 4: Wide horizontal face span (> 82px across 160px canvas)
          const isWideSpan = faceWidth >= 82 && skinCount >= 115;
          // Rule 5: Significant skin area surge above single student baseline (> 1.50x baseline + 32px)
          const isAreaSurge = skinCount >= Math.max(125, baselineSkinCount.current * 1.50) && (skinCount - baselineSkinCount.current >= 32);

          if (isLeftAndMiddle || isRightAndMiddle || isDualClusters || isWideSpan || isAreaSurge) {
            rawMultiPerson = true;
          }
        }

        if (rawMultiPerson) {
          multiPersonCountRef.current = Math.min(30, multiPersonCountRef.current + 2);
        } else {
          multiPersonCountRef.current = Math.max(0, multiPersonCountRef.current - 1);
        }

        // Fast confirmation within ~300ms (10 frames)
        const isMultiPersonConfirmed = multiPersonCountRef.current >= 10;
        if (isMultiPersonConfirmed !== multiPersonDetectedRef.current) {
          multiPersonDetectedRef.current = isMultiPersonConfirmed;
          setMultiPersonDetected(isMultiPersonConfirmed);
        }

        // Gaze Alignment & Look-away conditions:
        // 1. No face detected (left frame or turned away)
        // 2. Pupil gaze diverted (looking away sideways)
        // 3. Face turned sideways (asymmetryVal > 0.30)
        // 4. Head position drifted away (dx > 26 || dy > 22)
        // 5. Head slanted/tilted (slantVal > 0.30)
        // 6. Skin count dropped (showing back/side of head < 0.65 baseline)
        let isFaceOffCenter = false;
        let isSkinCountTooLow = false;
        let isAsymmetric = false;
        let isSlanted = false;
        let isPupilDiverted = false;

        if (isFacePresent && skinCount > 0) {
          const leftRatio = skinCountLeft / skinCount;
          const rightRatio = skinCountRight / skinCount;
          const asymmetryVal = Math.abs(leftRatio - rightRatio);
          
          // Face turn / side-view detection:
          if (asymmetryVal > 0.30) {
            isAsymmetric = true;
          }
          isAsymmetricActiveRef.current = isAsymmetric;
          setIsSideViewing(isAsymmetric);
          setFaceAsymmetry(Number(asymmetryVal.toFixed(2)));

          // Quad-diagonal asymmetry detector for head slanting (tilting)
          const diag1 = skinCountTL + skinCountBR;
          const diag2 = skinCountTR + skinCountBL;
          const slantVal = Math.abs(diag1 - diag2) / skinCount;
          if (slantVal > 0.30) {
            isSlanted = true;
          }
          setFaceSlant(Number(slantVal.toFixed(2)));

          // Pupil / Iris Gaze Direction:
          const pupilRatioL = (pupilLeftRef.current.x - eyeLeftRef.current.x) / eyeLeftRef.current.w;
          const pupilRatioR = (pupilRightRef.current.x - eyeRightRef.current.x) / eyeRightRef.current.w;
          const avgPupilRatio = (pupilRatioL + pupilRatioR) / 2;
          const gazeDev = Math.abs(avgPupilRatio - 0.50);
          const score = Math.max(0, Math.min(100, Math.round((1 - gazeDev * 2.2) * 100)));
          setGazeAlignment(score);

          if (pupilRatioL < 0.18 || pupilRatioL > 0.82 || pupilRatioR < 0.18 || pupilRatioR > 0.82) {
            isPupilDiverted = true;
          }
        } else {
          isAsymmetricActiveRef.current = false;
          setIsSideViewing(false);
          setFaceAsymmetry(0);
          setFaceSlant(0);
          setGazeAlignment(0);
        }

        if (baselineCenterX.current !== -1 && isCalibrated) {
          const dx = Math.abs(prevCenterX.current - baselineCenterX.current);
          const dy = Math.abs(prevCenterY.current - baselineCenterY.current);
          setDriftX(Number(dx.toFixed(1)));
          setDriftY(Number(dy.toFixed(1)));
          
          // Head position drift or turning away from center
          if (dx > 26 || dy > 22) {
            isFaceOffCenter = true;
          }
          
          // Turning head sideways lowers visible frontal skin surface area
          if (skinCount < baselineSkinCount.current * 0.65) {
            isSkinCountTooLow = true;
          }
        } else {
          setDriftX(0);
          setDriftY(0);
        }

        // Classify the EXACT active gaze error reason (Face turn & eye diversion strictly considered gaze errors)
        let currentReason: 'none' | 'multi_person' | 'face_missing' | 'side_view' | 'drift_off_center' | 'head_slanted' | 'face_occluded' = 'none';

        if (isMultiPersonConfirmed) {
          currentReason = 'multi_person';
        } else if (!isFacePresent) {
          currentReason = 'face_missing';
        } else if (isAsymmetric || isPupilDiverted) {
          // Face turned sideways or pupil gaze diverted
          currentReason = 'side_view';
        } else if (isFaceOffCenter) {
          currentReason = 'drift_off_center';
        } else if (isSlanted) {
          currentReason = 'head_slanted';
        } else if (isSkinCountTooLow) {
          currentReason = 'face_occluded';
        }

        if (currentReason !== activeGazeErrorRef.current) {
          activeGazeErrorRef.current = currentReason;
          setActiveGazeError(currentReason);
        }

        const isRawLookingAway = currentReason !== 'none';

        // Responsive hysteresis: engages within ~180ms (6 frames) for immediate feedback when face is turned
        if (isRawLookingAway) {
          if (currentReason === 'multi_person') {
            faceAbsentCountRef.current = Math.max(15, faceAbsentCountRef.current + 3);
          } else {
            faceAbsentCountRef.current += 2;
          }
          facePresentCountRef.current = 0;
        } else {
          facePresentCountRef.current += 1;
          faceAbsentCountRef.current = 0;
        }

        let nextLookingAway = isLookingAwayRef.current;
        if (faceAbsentCountRef.current >= 6) {
          nextLookingAway = true;
        } else if (facePresentCountRef.current >= 4) {
          nextLookingAway = false;
        }

        if (nextLookingAway !== isLookingAwayRef.current) {
          isLookingAwayRef.current = nextLookingAway;
          setIsLookingAway(nextLookingAway);
        }

        // Helper to extract average luminance in a sub-rectangle
        const getAvgLuminance = (x: number, y: number, w: number, h: number) => {
          const x1 = Math.max(0, Math.min(canvas.width - 1, x));
          const y1 = Math.max(0, Math.min(canvas.height - 1, y));
          const w1 = Math.max(1, Math.min(canvas.width - x1, w));
          const h1 = Math.max(1, Math.min(canvas.height - y1, h));

          const imgD = ctx.getImageData(x1, y1, w1, h1);
          const d = imgD.data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) {
            sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          }
          return sum / (d.length / 4);
        };

        // 1. Blink Detection
        // Only run blink checks if head is relatively stable to avoid motion-induced false alarms
        if (isFacePresent && !isLookingAwayRef.current) {
          const currentLumLeft = getAvgLuminance(eyeLeftRef.current.x, eyeLeftRef.current.y, eyeLeftRef.current.w, eyeLeftRef.current.h);
          const currentLumRight = getAvgLuminance(eyeRightRef.current.x, eyeRightRef.current.y, eyeRightRef.current.w, eyeRightRef.current.h);

          // Initialize or update running average baseline
          if (avgLuminanceLeft.current === -1) {
            avgLuminanceLeft.current = currentLumLeft;
          } else {
            avgLuminanceLeft.current = avgLuminanceLeft.current * 0.9 + currentLumLeft * 0.1;
          }

          if (avgLuminanceRight.current === -1) {
            avgLuminanceRight.current = currentLumRight;
          } else {
            avgLuminanceRight.current = avgLuminanceRight.current * 0.9 + currentLumRight * 0.1;
          }

          if (headShift < 1.5) {
            const deltaLeft = Math.abs(currentLumLeft - avgLuminanceLeft.current);
            const deltaRight = Math.abs(currentLumRight - avgLuminanceRight.current);
            const maxDiff = Math.max(deltaLeft, deltaRight);
            setCalibrationDiff(Number(maxDiff.toFixed(1)));

            // Impose a 400ms debounce cool-down on registering consecutive blinks
            if (maxDiff > blinkThreshold && (Date.now() - lastBlinkTimeRef.current) > 400) {
              registerBlink();
              // Reset baseline immediately to prevent multi-triggering
              avgLuminanceLeft.current = currentLumLeft;
              avgLuminanceRight.current = currentLumRight;
            }
          }
        }

        // 3. Draw HUD Overlays onto canvas using stable ref values
        const currentErr = activeGazeErrorRef.current;
        const errDetails = getGazeErrorDetails(currentErr);

        // Top Status Badge on Video Canvas HUD
        if (currentErr === 'none') {
          ctx.fillStyle = 'rgba(0, 108, 73, 0.90)'; // Emerald OK
          ctx.fillRect(4, 4, 152, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('● 1 MEMBER IN FRAME (FOCUS OK)', 80, 14);
        } else if (currentErr === 'multi_person') {
          ctx.fillStyle = 'rgba(234, 88, 12, 0.96)'; // Orange Multi-Person
          ctx.fillRect(4, 4, 152, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⚠ 2+ PEOPLE (${gazeStatusThresholdRef.current}s LIMIT)`, 80, 14);
        } else {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.96)'; // Red Gaze Error
          ctx.fillRect(4, 4, 152, 14);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚠ ' + errDetails.shortCode, 80, 14);
        }
        ctx.textAlign = 'start';

        // Face outline box
        ctx.strokeStyle = currentErr === 'multi_person' ? '#f97316' : currentErr !== 'none' ? '#ef4444' : '#006c49';
        ctx.lineWidth = 1.5;
        if (isFacePresent) {
          // Dynamic bounding box around face centroid
          ctx.strokeRect(prevCenterX.current - 28, prevCenterY.current - 35, 56, 70);
          
          // Draw face center crosshair dot
          ctx.fillStyle = currentErr === 'multi_person' ? '#f97316' : currentErr !== 'none' ? '#ef4444' : '#10b981';
          ctx.beginPath();
          ctx.arc(prevCenterX.current, prevCenterY.current, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fallback static guide when face is missing
          ctx.beginPath();
          ctx.arc(80, 60, 36, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Eye tracking bounding boxes
        ctx.strokeStyle = isBlinkingRef.current ? '#f59e0b' : currentErr !== 'none' ? 'rgba(239, 68, 68, 0.75)' : '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(eyeLeftRef.current.x, eyeLeftRef.current.y, eyeLeftRef.current.w, eyeLeftRef.current.h);
        ctx.strokeRect(eyeRightRef.current.x, eyeRightRef.current.y, eyeRightRef.current.w, eyeRightRef.current.h);

        // Pupil Focus Crosshairs & Target Points
        if (isFacePresent) {
          ctx.fillStyle = currentErr !== 'none' ? '#ef4444' : '#10b981';
          // Left pupil focus dot
          ctx.beginPath();
          ctx.arc(pupilLeftRef.current.x, pupilLeftRef.current.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          // Right pupil focus dot
          ctx.beginPath();
          ctx.arc(pupilRightRef.current.x, pupilRightRef.current.y, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Inter-ocular focus bridge line
          ctx.strokeStyle = currentErr !== 'none' ? 'rgba(239, 68, 68, 0.45)' : 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(pupilLeftRef.current.x, pupilLeftRef.current.y);
          ctx.lineTo(pupilRightRef.current.x, pupilRightRef.current.y);
          ctx.stroke();
        }

        // Center crosshair indicators
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 20); ctx.lineTo(80, 115);
        ctx.moveTo(5, 60); ctx.lineTo(155, 60);
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
  }, [isCameraActive]);

  // Unified 1-second focus monitoring loop running in parallel
  useEffect(() => {
    if (!isCameraActive) return;

    const timer = setInterval(() => {
      const isMulti = multiPersonDetectedRef.current;
      const isAway = isLookingAwayRef.current && !isMulti;

      // 1. Multi-Person Frame Security Monitor (Gaze Status: 1 Member Focused)
      // Policy: Only 1 member in frame. Alerts when violation reaches configured time (10s, 30s, or 60s)
      if (isMulti) {
        setSecondsMultiPerson(prev => {
          const nextVal = prev + 1;
          const targetGazeTime = gazeStatusThresholdRef.current;
          if (nextVal >= targetGazeTime && !hasAlertedForMultiPersonRef.current) {
            hasAlertedForMultiPersonRef.current = true;
            playMultiPersonAlertSound();
            const roomName = activeRoomRef.current?.name;
            dispatchAdminAlert(
              'Security Alert: Only 1 Member Allowed in Frame',
              roomName
                ? `Security alert in room "${roomName}": More than 1 person detected in frame (duration: ${targetGazeTime}.0s). Only 1 member is permitted.`
                : `Security alert: More than 1 person detected in frame (duration: ${targetGazeTime}.0s). Only 1 member is permitted.`,
              roomName ? `AI Gaze Security (${roomName})` : 'AI Gaze Security'
            );
            setShowMultiPersonAlertModal(true);
          }
          return nextVal;
        });
      } else {
        setSecondsMultiPerson(0);
        hasAlertedForMultiPersonRef.current = false;
        setShowMultiPersonAlertModal(false);
      }

      // 2. Look at Screen Monitor
      // Tracks if student is looking directly at workspace screen
      if (isAway) {
        setSecondsLookingAway(prev => {
          const nextVal = prev + 1;
          const threshold = lookAwayThresholdRef.current;
          if (nextVal >= threshold && !hasAlertedForLookAwayRef.current) {
            hasAlertedForLookAwayRef.current = true;
            playLookAwayAlertSound();
            const roomName = activeRoomRef.current?.name;
            const currentErr = activeGazeErrorRef.current;
            const errInfo = getGazeErrorDetails(currentErr);
            dispatchAdminAlert(
              `Look at Screen Alert: ${errInfo.title}`,
              roomName
                ? `${errInfo.description} (Room: "${roomName}", duration: ${threshold}.0s). Student must look directly at the study screen.`
                : `${errInfo.description} (duration: ${threshold}.0s). Student must look directly at the study screen.`,
              roomName ? `AI Screen Focus Guard (${roomName})` : 'AI Screen Focus Guard'
            );
            setShowLookAwayAlertModal(true);
          }
          return nextVal;
        });
      } else {
        setSecondsLookingAway(0);
        hasAlertedForLookAwayRef.current = false;
        setShowLookAwayAlertModal(false);
      }

      // 3. Eye-Blink Stare Monitor (Runs in parallel)
      // Reset stare duration baseline while multi-person or look-away is active
      if (isMulti || isAway) {
        lastBlinkTimeRef.current = Date.now();
        setSecondsSinceLastBlink(0);
        setShowBlinkAlertModal(false);
      } else {
        const elapsed = Math.floor((Date.now() - lastBlinkTimeRef.current) / 1000);
        setSecondsSinceLastBlink(elapsed);

        if (elapsed >= stareDurationLimitRef.current) {
          if (!hasAlertedForCurrentStareRef.current) {
            hasAlertedForCurrentStareRef.current = true;
            playBlinkAlertSound();
            const roomName = activeRoomRef.current?.name;
            dispatchAdminAlert(
              'Eye-Blink Attention Alert',
              roomName
                ? `Focus warning: Student in study room "${roomName}" has not blinked for over ${stareDurationLimitRef.current}.0 seconds. Possible eye fatigue.`
                : `Focus warning: Student has not blinked for over ${stareDurationLimitRef.current}.0 seconds. Possible eye fatigue.`,
              roomName ? `AI Eye-Blink Monitor (${roomName})` : 'AI Eye-Blink Monitor'
            );
            setShowBlinkAlertModal(true);
          }
        } else {
          setShowBlinkAlertModal(false);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCameraActive]);

  if (settings?.cameraEnabled === false) {
    return (
      <div className="bg-surface-container-low border border-amber-500/30 rounded-xl p-4 text-center space-y-2.5">
        <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wide">
          <span className="material-symbols-outlined text-lg">videocam_off</span>
          Webcam Disabled by Admin
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          The administrator has turned off webcam monitoring system-wide. Camera features and gaze tracking are disabled.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Privacy Protection Active
        </div>
      </div>
    );
  }

  if (!shouldBeActive) {
    return (
      <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-center space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-on-surface font-bold text-xs uppercase tracking-wide">
          <span className="material-symbols-outlined text-secondary text-lg">videocam</span>
          AI Attention Guard
        </div>
        <p className="text-[11px] text-on-surface-variant">
          Monitors eye blink rate, gaze direction & student focus in real-time.
        </p>

        <div className="pt-1 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setManualCheckActive(true)}
            className="w-full py-1.5 px-3 bg-secondary hover:brightness-110 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-sm">camera</span>
            Start Camera Check
          </button>
          
          <button
            type="button"
            onClick={() => {
              updateSettings({ studyMode: true });
              startTimer();
            }}
            className="w-full py-1.5 px-3 bg-primary/10 hover:bg-primary/15 text-primary dark:text-emerald-400 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">play_circle</span>
            Turn On Study Mode & Start Session
          </button>
        </div>
      </div>
    );
  }

  const isBlinkWarning = secondsSinceLastBlink >= stareWarningThreshold;
  const isBlinkAlertState = secondsSinceLastBlink >= stareDurationLimit;

  const isMultiPersonWarning = secondsMultiPerson >= Math.max(1, Math.round(gazeStatusThreshold * 0.5));
  const isMultiPersonAlertState = secondsMultiPerson >= gazeStatusThreshold;

  const isScreenLookAwayWarning = secondsLookingAway >= gazeWarningThreshold;
  const isScreenLookAwayAlertState = secondsLookingAway >= lookAwayThreshold;

  const isLookingAwayFromScreen = isLookingAway && activeGazeError !== 'multi_person' && activeGazeError !== 'none';
  const currentErrInfo = getGazeErrorDetails(activeGazeError);

  return (
    <div className={`p-sm rounded-xl border transition-all duration-300 ${
      multiPersonDetected
        ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.25)]'
        : isBlinkAlertState || isScreenLookAwayAlertState
        ? 'bg-red-500/10 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.25)]' 
        : isBlinkWarning || isScreenLookAwayWarning || isMultiPersonWarning
        ? 'bg-amber-500/5 border-amber-500' 
        : 'bg-surface border-outline-variant/40 text-on-surface'
    }`}>
      
      {/* Header Info */}
      <div className="flex items-center justify-between mb-sm">
        <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-xs">
          <span className={`w-2 h-2 rounded-full inline-block ${isCameraActive ? 'bg-secondary animate-pulse' : 'bg-red-500'}`}></span>
          AI Attention Guard
        </h4>
        <div className="flex items-center gap-1">
          {manualCheckActive && (
            <button
              type="button"
              onClick={() => {
                setManualCheckActive(false);
                stopCamera();
              }}
              className="text-[9px] px-2 py-0.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded cursor-pointer transition-colors border border-outline-variant/30"
            >
              Stop Check
            </button>
          )}
          <span className="text-[9px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded font-mono font-bold border border-outline-variant/20">
            Alerts: {alertsCount}
          </span>
        </div>
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
          ></video>
          <canvas
            ref={canvasRef}
            width={160}
            height={120}
            className="absolute inset-0 w-full h-full z-10 pointer-events-none"
          ></canvas>
          
          {isBlinking && !isLookingAway && (
            <div className="absolute inset-0 bg-secondary/15 flex items-center justify-center z-25 pointer-events-none">
              <span className="bg-secondary text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-ping">
                Blink!
              </span>
            </div>
          )}

          {/* Look at Screen Video Overlay Badge */}
          {isLookingAwayFromScreen && (
            <div className="absolute inset-0 bg-red-600/15 flex items-center justify-center z-25 pointer-events-none">
              <span className="font-bold text-[8.5px] px-2.5 py-1 rounded-md uppercase tracking-wider text-white shadow-md bg-red-600 animate-pulse">
                ⚠ {activeGazeError === 'side_view' ? 'FACE TURNED AWAY (GAZE ERROR)' : 'LOOK AT SCREEN'} ({secondsLookingAway}s / {lookAwayThreshold}s)
              </span>
            </div>
          )}

          {/* Multi-Person Video Overlay Badge */}
          {multiPersonDetected && (
            <div className="absolute inset-0 bg-orange-600/20 flex items-center justify-center z-25 pointer-events-none">
              <span className="font-bold text-[8.5px] px-2.5 py-1 rounded-md uppercase tracking-wider text-white shadow-md bg-orange-600 animate-pulse">
                ⚠ 2+ MEMBERS DETECTED ({secondsMultiPerson}s / {gazeStatusThreshold}.0s)
              </span>
            </div>
          )}
          
          {/* Blink Alert Video Overlay Badge */}
          {isBlinkAlertState && !isLookingAwayFromScreen && !multiPersonDetected && (
            <div className="absolute inset-0 bg-red-600/20 flex flex-col items-center justify-center z-25 pointer-events-none">
              <span className="bg-red-600 text-white font-bold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider animate-bounce">
                ATTENTION: PLEASE BLINK
              </span>
            </div>
          )}

          {/* Alert Modal 1: Multi-Person Frame Security Violation */}
          {showMultiPersonAlertModal && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-3 z-30 text-center animate-fade-in">
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5 shadow-lg bg-orange-500/20 text-orange-400 border border-orange-500/40">
                <span className="material-symbols-outlined text-2xl animate-bounce">group_off</span>
              </div>
              <h5 className="text-[11px] font-black text-white uppercase tracking-wider">
                Security Alert: Only 1 Member Allowed
              </h5>
              <p className="text-[9.5px] text-slate-200 mt-1 mb-1 px-1 font-semibold leading-tight">
                Another person was detected in camera frame. Focus policy strictly allows only 1 registered member in view.
              </p>
              <div className="text-[8.5px] text-amber-200 font-bold mb-2 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">
                Action: Ensure all other individuals step out of camera view immediately.
              </div>
              <button
                onClick={() => {
                  setShowMultiPersonAlertModal(false);
                  resetCalibrationValues();
                }}
                className="px-3.5 py-1 bg-primary hover:bg-primary/90 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer shadow-md"
              >
                Dismiss &amp; Recalibrate
              </button>
            </div>
          )}

          {/* Alert Modal 2: Look at Screen Warning */}
          {showLookAwayAlertModal && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-3 z-30 text-center animate-fade-in">
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5 shadow-lg bg-red-500/20 text-red-400 border border-red-500/40">
                <span className="material-symbols-outlined text-2xl animate-bounce">visibility_off</span>
              </div>
              <h5 className="text-[11px] font-black text-white uppercase tracking-wider">
                Look at Screen Alert!
              </h5>
              <p className="text-[9.5px] text-slate-200 mt-1 mb-1 px-1 font-semibold leading-tight">
                {currentErrInfo.description}
              </p>
              <div className="text-[8.5px] text-amber-200 font-bold mb-2 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">
                Action: {currentErrInfo.resolution}
              </div>
              <button
                onClick={() => {
                  setShowLookAwayAlertModal(false);
                  resetCalibrationValues();
                }}
                className="px-3.5 py-1 bg-primary hover:bg-primary/90 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer shadow-md"
              >
                Dismiss &amp; Resume Study
              </button>
            </div>
          )}

          {/* Alert Modal 3: Stare Warning / Eye Blink Alert */}
          {showBlinkAlertModal && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-sm z-30 text-center animate-fade-in">
              <span className="material-symbols-outlined text-amber-400 text-3xl animate-bounce mb-xs">visibility</span>
              <h5 className="text-[11px] font-black text-white uppercase tracking-wider">Stare Warning!</h5>
              <p className="text-[9.5px] text-slate-200 mt-1 mb-sm px-xs font-semibold">
                Please blink your eyes to reduce fatigue.
              </p>
              <button
                onClick={() => {
                  setShowBlinkAlertModal(false);
                  registerBlink();
                }}
                className="px-3 py-1 bg-primary hover:bg-primary/90 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Control Details and Timers: 3 Metrics Display */}
      <div className="mt-sm space-y-2.5">
        
        {/* Metric 1: Stare Duration (Configured: 1 to 10s) */}
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-primary">visibility</span>
              Stare Duration:
            </span>
            <span className={`font-mono font-black ${isBlinkAlertState ? 'text-red-600' : isBlinkWarning ? 'text-amber-500' : 'text-primary'}`}>
              {secondsSinceLastBlink}s / {stareDurationLimit}.0s
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${
                isBlinkAlertState ? 'bg-red-500' : isBlinkWarning ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, (secondsSinceLastBlink / stareDurationLimit) * 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 2: Gaze Status: 1 Member Focused (Configured: 10s, 30s, or 60s) */}
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-secondary">person</span>
              Gaze Status:
            </span>
            <span className={`font-mono font-black flex items-center gap-1 ${
              multiPersonDetected
                ? 'text-orange-600 dark:text-orange-400'
                : activeGazeError === 'face_missing'
                ? 'text-red-600 dark:text-red-400'
                : isLookingAwayFromScreen
                ? 'text-red-600 dark:text-red-400'
                : 'text-secondary'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                multiPersonDetected
                  ? 'bg-orange-600 animate-pulse'
                  : activeGazeError === 'face_missing'
                  ? 'bg-red-600'
                  : isLookingAwayFromScreen
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-secondary'
              }`}></span>
              {multiPersonDetected
                ? `Multiple Persons (${secondsMultiPerson}s / ${gazeStatusThreshold}.0s)`
                : activeGazeError === 'face_missing'
                ? 'No Member in Frame'
                : isLookingAwayFromScreen
                ? `Face Turned Away (${secondsLookingAway}s / ${gazeStatusThreshold}.0s)`
                : '1 Member Focused (OK)'}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${
                multiPersonDetected
                  ? 'bg-orange-500'
                  : activeGazeError === 'face_missing'
                  ? 'bg-red-500'
                  : isScreenLookAwayAlertState
                  ? 'bg-red-500'
                  : isScreenLookAwayWarning
                  ? 'bg-amber-500'
                  : 'bg-secondary'
              }`}
              style={{
                width: multiPersonDetected
                  ? `${Math.min(100, (secondsMultiPerson / gazeStatusThreshold) * 100)}%`
                  : isLookingAwayFromScreen
                  ? `${Math.min(100, (secondsLookingAway / gazeStatusThreshold) * 100)}%`
                  : '100%'
              }}
            ></div>
          </div>
        </div>

        {/* Metric 3: Look at Screen (Configured: 10s, 30s, or 60s) */}
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">desktop_windows</span>
              Look at Screen:
            </span>
            <span className={`font-mono font-black flex items-center gap-1 ${
              isLookingAwayFromScreen ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                isLookingAwayFromScreen ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'
              }`}></span>
              {isLookingAwayFromScreen
                ? `Face Turned Away (${secondsLookingAway}s / ${lookAwayThreshold}.0s)`
                : 'Screen Aligned (OK)'}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-100 ${
                isScreenLookAwayAlertState ? 'bg-red-500' : isScreenLookAwayWarning ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{
                width: isLookingAwayFromScreen
                  ? `${Math.min(100, (secondsLookingAway / lookAwayThreshold) * 100)}%`
                  : '100%'
              }}
            ></div>
          </div>
        </div>

        {/* Explicit Gaze Error Diagnostic & Status Card (No truncation) */}
        <div className={`p-2.5 rounded-lg border text-left transition-all ${
          multiPersonDetected
            ? 'bg-orange-500/15 border-orange-500/40 text-slate-900 dark:text-slate-100'
            : isLookingAwayFromScreen
            ? 'bg-red-500/15 border-red-500/40 text-slate-900 dark:text-slate-100'
            : 'bg-emerald-500/15 border-emerald-500/35 text-slate-900 dark:text-slate-100'
        }`}>
          <div className="flex items-start gap-2">
            <span className={`material-symbols-outlined text-[17px] shrink-0 mt-0.5 ${
              multiPersonDetected
                ? 'text-orange-600 dark:text-orange-400'
                : isLookingAwayFromScreen
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {multiPersonDetected
                ? 'group_off'
                : isLookingAwayFromScreen
                ? 'visibility_off'
                : 'check_circle'}
            </span>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  multiPersonDetected
                    ? 'text-orange-700 dark:text-orange-300'
                    : isLookingAwayFromScreen
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  {multiPersonDetected
                    ? 'SECURITY ALERT: ONLY 1 MEMBER ALLOWED'
                    : isLookingAwayFromScreen
                    ? `LOOK AT SCREEN ERROR: ${currentErrInfo.title.toUpperCase()}`
                    : 'ALL CHECKS PASSING: 1 MEMBER FOCUSED & LOOKING AT SCREEN'}
                </span>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase ${
                  multiPersonDetected
                    ? 'bg-orange-600 text-white'
                    : isLookingAwayFromScreen
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {multiPersonDetected ? '2+ MEMBERS' : isLookingAwayFromScreen ? currentErrInfo.shortCode : 'SCREEN ALIGNED'}
                </span>
              </div>
              <p className="text-[9.5px] text-slate-900 dark:text-slate-100 font-semibold leading-snug">
                {multiPersonDetected
                  ? 'Another person detected in the camera frame. Focus policy strictly allows only 1 registered member in view.'
                  : isLookingAwayFromScreen
                  ? currentErrInfo.description
                  : 'Student is looking directly at the workspace screen with normal gaze alignment and 1 member in frame.'}
              </p>
              {(multiPersonDetected || isLookingAwayFromScreen) && (
                <p className="text-[8.5px] font-bold text-amber-800 dark:text-amber-300 pt-0.5">
                  ➔ {multiPersonDetected ? 'Ensure all other individuals step out of camera view immediately (Alert fires within 5s).' : currentErrInfo.resolution}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Camera Selector Dropdown */}
        {devices.length > 0 && (
          <div className="space-y-xs">
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-900 dark:text-slate-100">
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                Webcam Input Source:
              </span>
            </div>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full text-[10px] bg-surface border border-outline-variant rounded px-2 py-1.5 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-surface text-slate-900 dark:text-slate-100 font-semibold">
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Live Debug Metrics */}
        <div className="flex justify-between items-center text-[8.5px] text-slate-900 dark:text-slate-100 font-bold font-mono flex-wrap gap-x-sm">
          <span className="text-emerald-600 dark:text-emerald-400 font-black">GAZE: {gazeAlignment}%</span>
          <span>EYE DELTA: {calibrationDiff}</span>
          <span>CALIB: {isCalibrated ? 'OK' : 'CALIBRATING'}</span>
          <span>ERR: {activeGazeError}</span>
          <span>ASYM: {faceAsymmetry}</span>
          <span>SLANT: {faceSlant}</span>
          <span>DRIFT: X:{driftX} Y:{driftY}</span>
          <span>SKIN: {liveSkinCount} / {baseSkinCount}</span>
        </div>

        {/* Manual controls */}
        <div className="pt-xs flex flex-col gap-xs">
          {isCameraActive && (
            <button
              onClick={() => resetCalibrationValues()}
              className="w-full py-1 bg-secondary hover:bg-secondary/90 text-white rounded text-[9px] font-bold cursor-pointer transition-colors shadow-xs"
            >
              Recalibrate Face &amp; Gaze
            </button>
          )}
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
