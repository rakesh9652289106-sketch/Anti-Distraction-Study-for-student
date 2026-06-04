'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function AttentionCamera() {
  const { settings, isTimerRunning, activeRoom } = useApp();
  const [, setStreamState] = useState<MediaStream | null>(null);
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

  // Warning modal states for student attention UI alerts
  const [showGazeAlertModal, setShowGazeAlertModal] = useState<boolean>(false);
  const [showBlinkAlertModal, setShowBlinkAlertModal] = useState<boolean>(false);

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
  const eyeLeftRef = useRef({ x: 55, y: 45, w: 12, h: 9 });
  const eyeRightRef = useRef({ x: 87, y: 45, w: 12, h: 9 });
  
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
      const now = Date.now();
      lastBlinkTimeRef.current = now;
      hasAlertedForCurrentStareRef.current = false;
      setSecondsLookingAway(0);
      hasAlertedForLookAwayRef.current = false;
      setIsLookingAway(false);
      isLookingAwayRef.current = false;
      setIsSideViewing(false);
      setIsBlinking(false);
      isBlinkingRef.current = false;
      setShowGazeAlertModal(false);
      setShowBlinkAlertModal(false);
      faceAbsentCountRef.current = 0;
      facePresentCountRef.current = 0;
      prevCenterX.current = 80;
      prevCenterY.current = 55;
      baselineCenterX.current = -1;
      baselineCenterY.current = -1;
      baselineSkinCount.current = -1;
      setIsCalibrated(false);
      setFaceAsymmetry(0);
      setFaceSlant(0);
      setDriftX(0);
      setDriftY(0);
      setLiveSkinCount(0);
      setBaseSkinCount(0);
      calibratedR.current = -1;
      calibratedG.current = -1;
      calibratedB.current = -1;
      needsColorCalibration.current = true;
      setCalibColor('N/A');
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
    avgLuminanceLeft.current = -1;
    avgLuminanceRight.current = -1;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  const shouldBeActive = settings.studyMode && isTimerRunning;

  // Toggle based on Focus Mode setting
  useEffect(() => {
    if (shouldBeActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldBeActive]);

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
           baselineCenterX.current = -1;
          baselineCenterY.current = -1;
          baselineSkinCount.current = -1;
          setIsCalibrated(false);
          setFaceAsymmetry(0);
          setFaceSlant(0);
          setDriftX(0);
          setDriftY(0);
          setLiveSkinCount(0);
          setBaseSkinCount(0);
          calibratedR.current = -1;
          calibratedG.current = -1;
          calibratedB.current = -1;
          needsColorCalibration.current = true;
          setCalibColor('N/A');
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

        // Perform color calibration if needed on first stable frame
        if (needsColorCalibration.current) {
          let sumCalibR = 0;
          let sumCalibG = 0;
          let sumCalibB = 0;
          let calibPoints = 0;
          
          // Sample a 40x40 region in the center of the canvas (X: 60-100, Y: 40-80)
          for (let cy = 40; cy < 80; cy += 2) {
            for (let cx = 60; cx < 100; cx += 2) {
              const cidx = (cy * canvas.width + cx) * 4;
              sumCalibR += data[cidx];
              sumCalibG += data[cidx + 1];
              sumCalibB += data[cidx + 2];
              calibPoints++;
            }
          }
          
          if (calibPoints > 0) {
            calibratedR.current = sumCalibR / calibPoints;
            calibratedG.current = sumCalibG / calibPoints;
            calibratedB.current = sumCalibB / calibPoints;
            needsColorCalibration.current = false;
            setCalibColor(`${Math.round(calibratedR.current)},${Math.round(calibratedG.current)},${Math.round(calibratedB.current)}`);
          }
        }

        // Skin color centroid detection (simple face tracking)
        let skinCount = 0;
        let skinCountLeft = 0;
        let skinCountRight = 0;
        let skinCountTL = 0;
        let skinCountTR = 0;
        let skinCountBL = 0;
        let skinCountBR = 0;
        let sumX = 0;
        let sumY = 0;

        // Narrow the search loop to the central focus zone to ignore background wood/corners
        for (let y = 20; y < canvas.height - 20; y += 2) {
          for (let x = 30; x < canvas.width - 30; x += 2) {
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // Adaptive skin detection relative to calibrated face color
            let isSkin = false;
            if (calibratedR.current !== -1) {
              const diffR = Math.abs(r - calibratedR.current);
              const diffG = Math.abs(g - calibratedG.current);
              const diffB = Math.abs(b - calibratedB.current);
              isSkin = diffR < 35 && diffG < 35 && diffB < 35 && (r + g + b) > 60;
            } else {
              // Fallback to basic rule if not calibrated yet
              const sum = r + g + b;
              isSkin = sum > 70 && r > 45 && g > 35 && b > 20 && r > g;
            }

            if (isSkin) {
              skinCount++;
              sumX += x;
              sumY += y;
              
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

        const isFacePresent = skinCount >= 25;
        let centerX = 80;
        let centerY = 55;
        let headShift = 0;

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

          // Calibrate baseline values on first stable face frame
          if (baselineCenterX.current === -1) {
            baselineCenterX.current = centerX;
            baselineCenterY.current = centerY;
            baselineSkinCount.current = skinCount;
            setIsCalibrated(true);
          }

          // Smooth centroid to reduce jitter (exponential moving average)
          const smoothFactor = 0.08;
          const finalX = prevCenterX.current + (centerX - prevCenterX.current) * smoothFactor;
          const finalY = prevCenterY.current + (centerY - prevCenterY.current) * smoothFactor;

          // Compute absolute distance shifted this frame
          headShift = Math.sqrt(
            Math.pow(finalX - prevCenterX.current, 2) + 
            Math.pow(finalY - prevCenterY.current, 2)
          );

          prevCenterX.current = finalX;
          prevCenterY.current = finalY;

          // Slowly adapt the baseline only when the user is stable, not looking away, and very close to the baseline
          if (baselineCenterX.current !== -1) {
            const dx = Math.abs(finalX - baselineCenterX.current);
            const dy = Math.abs(finalY - baselineCenterY.current);
            if (!isLookingAwayRef.current && headShift < 1.0 && dx < 5 && dy < 5) {
              baselineCenterX.current = baselineCenterX.current * 0.99 + finalX * 0.01;
              baselineCenterY.current = baselineCenterY.current * 0.99 + finalY * 0.01;
              baselineSkinCount.current = baselineSkinCount.current * 0.99 + skinCount * 0.01;
            }
          }

          // Dynamically adjust eye box coordinates relative to face centroid
          eyeLeftRef.current = {
            x: Math.round(Math.max(5, Math.min(140, finalX - 22))),
            y: Math.round(Math.max(5, Math.min(105, finalY - 8))),
            w: 12,
            h: 9
          };
          eyeRightRef.current = {
            x: Math.round(Math.max(5, Math.min(140, finalX + 10))),
            y: Math.round(Math.max(5, Math.min(105, finalY - 8))),
            w: 12,
            h: 9
          };
        }

        // Look away conditions:
        // 1. No skin pixels/face detected (user has left the frame or turned away completely)
        // 2. Face centroid shifted too far relative to the calibrated baseline (user turned head or leaned away)
        // 3. Skin count dropped significantly compared to baseline (user turned head away, revealing hair)
        // 4. Skin distribution is asymmetric (user turned head to the side)
        // 5. Head is slanted/tilted sideways
        let isFaceOffCenter = false;
        let isSkinCountTooLow = false;
        let isAsymmetric = false;
        let isSlanted = false;

        if (isFacePresent && skinCount > 0) {
          const leftRatio = skinCountLeft / skinCount;
          const rightRatio = skinCountRight / skinCount;
          const asymmetryVal = Math.abs(leftRatio - rightRatio);
          
          if (asymmetryVal > 0.28) {
            isAsymmetric = true;
          }
          isAsymmetricActiveRef.current = isAsymmetric;
          setIsSideViewing(isAsymmetric);
          setFaceAsymmetry(Number(asymmetryVal.toFixed(2)));

          // Quad-diagonal asymmetry detector for head slanting (tilting)
          const diag1 = skinCountTL + skinCountBR;
          const diag2 = skinCountTR + skinCountBL;
          const slantVal = Math.abs(diag1 - diag2) / skinCount;
          if (slantVal > 0.20) {
            isSlanted = true;
          }
          setFaceSlant(Number(slantVal.toFixed(2)));
        } else {
          isAsymmetricActiveRef.current = false;
          setIsSideViewing(false);
          setFaceAsymmetry(0);
          setFaceSlant(0);
        }

        if (baselineCenterX.current !== -1) {
          const dx = Math.abs(prevCenterX.current - baselineCenterX.current);
          const dy = Math.abs(prevCenterY.current - baselineCenterY.current);
          setDriftX(Number(dx.toFixed(1)));
          setDriftY(Number(dy.toFixed(1)));
          
          if (dx > 12 || dy > 10) {
            isFaceOffCenter = true;
          }
          
          if (skinCount < baselineSkinCount.current * 0.65) {
            isSkinCountTooLow = true;
          }
        } else {
          setDriftX(0);
          setDriftY(0);
        }

        const isRawLookingAway = !isFacePresent || isFaceOffCenter || isSkinCountTooLow || isAsymmetric || isSlanted;

        // Apply hysteresis: 15 frames for absence (approx 250-500ms), 5 frames for presence (approx 80-160ms)
        if (isRawLookingAway) {
          faceAbsentCountRef.current += 1;
          facePresentCountRef.current = 0;
        } else {
          facePresentCountRef.current += 1;
          faceAbsentCountRef.current = 0;
        }

        let nextLookingAway = isLookingAwayRef.current;
        if (faceAbsentCountRef.current >= 15) {
          nextLookingAway = true;
        } else if (facePresentCountRef.current >= 5) {
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
        // Face outline box
        ctx.strokeStyle = isLookingAwayRef.current ? '#ef4444' : '#006c49';
        ctx.lineWidth = 1.5;
        if (isFacePresent) {
          // Dynamic bounding box around face centroid
          ctx.strokeRect(prevCenterX.current - 28, prevCenterY.current - 35, 56, 70);
          
          // Draw face center crosshair dot
          ctx.fillStyle = isLookingAwayRef.current ? '#ef4444' : '#10b981';
          ctx.beginPath();
          ctx.arc(prevCenterX.current, prevCenterY.current, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fallback static guide when face is missing
          ctx.beginPath();
          ctx.arc(80, 55, 38, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Eye tracking bounding boxes
        ctx.strokeStyle = isBlinkingRef.current ? '#f59e0b' : isLookingAwayRef.current ? 'rgba(239, 68, 68, 0.4)' : '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(eyeLeftRef.current.x, eyeLeftRef.current.y, eyeLeftRef.current.w, eyeLeftRef.current.h);
        ctx.strokeRect(eyeRightRef.current.x, eyeRightRef.current.y, eyeRightRef.current.w, eyeRightRef.current.h);

        // Center crosshair indicators
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(80, 5); ctx.lineTo(80, 115);
        ctx.moveTo(5, 55); ctx.lineTo(155, 55);
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
      // 1. Gaze Look-Away Monitor
      if (isLookingAwayRef.current) {
        setSecondsLookingAway(prev => {
          const nextVal = prev + 1;
          if (nextVal >= 10 && !hasAlertedForLookAwayRef.current) {
            hasAlertedForLookAwayRef.current = true;
            playLookAwayAlertSound();
            const roomName = activeRoomRef.current?.name;
            
            const isSideView = isAsymmetricActiveRef.current;
            const alertTitle = isSideView ? 'Side-Viewing Attention Alert' : 'Look-Away Attention Alert';
            const alertText = isSideView
              ? (roomName
                  ? `Focus warning: Student in study room "${roomName}" has been looking to the side for over 10.0 seconds. The person should see the screen.`
                  : 'Focus warning: Student has been looking to the side for over 10.0 seconds. The person should see the screen.')
              : (roomName
                  ? `Focus warning: Student in study room "${roomName}" has been looking away from the screen for over 10.0 seconds. The person should see the screen.`
                  : 'Focus warning: Student has been looking away from the screen for over 10.0 seconds. The person should see the screen.');

            dispatchAdminAlert(
              alertTitle,
              alertText,
              roomName ? `AI Look-Away Monitor (${roomName})` : 'AI Look-Away Monitor'
            );
            setShowGazeAlertModal(true);
          }
          return nextVal;
        });
      } else {
        setSecondsLookingAway(0);
        hasAlertedForLookAwayRef.current = false;
        setShowGazeAlertModal(false);
      }

      // 2. Eye-Blink Stare Monitor (Runs in parallel)
      // Reset stare duration baseline to current time while looking away to avoid dual alert clashes
      if (isLookingAwayRef.current) {
        lastBlinkTimeRef.current = Date.now();
        setSecondsSinceLastBlink(0);
        setShowBlinkAlertModal(false);
      } else {
        const elapsed = Math.floor((Date.now() - lastBlinkTimeRef.current) / 1000);
        setSecondsSinceLastBlink(elapsed);

        if (elapsed >= 7) {
          if (!hasAlertedForCurrentStareRef.current) {
            hasAlertedForCurrentStareRef.current = true;
            playBlinkAlertSound();
            const roomName = activeRoomRef.current?.name;
            dispatchAdminAlert(
              'Eye-Blink Attention Alert',
              roomName
                ? `Focus warning: Student in study room "${roomName}" has not blinked for over 7.0 seconds. Possible eye fatigue.`
                : 'Focus warning: Student has not blinked for over 7.0 seconds. Possible eye fatigue.',
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

  if (!shouldBeActive) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl p-sm text-center">
        <span className="material-symbols-outlined text-on-surface-variant/40 text-2xl mb-1">videocam_off</span>
        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Eye-Blink Tracker Offline</p>
        <p className="text-[9px] text-on-surface-variant/75 mt-0.5">
          {!settings.studyMode 
            ? "Webcam activates automatically when Study Mode is turned on."
            : "Webcam activates automatically when Focus session starts."}
        </p>
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
                {isSideViewing ? 'Side-Viewing Warning' : 'Gaze Warning'}
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
                {isSideViewing ? 'SIDE VIEWING DETECTED - SEE THE SCREEN' : 'THE PERSON SHOULD SEE THE SCREEN'}
              </span>
            </div>
          )}

          {showGazeAlertModal && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-sm z-30 text-center animate-fade-in">
              <span className="material-symbols-outlined text-red-500 text-3xl animate-bounce mb-xs">warning</span>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Attention Alert!</h5>
              <p className="text-[9px] text-slate-300 mt-1 mb-sm px-xs font-semibold">
                {isSideViewing 
                  ? 'Side-viewing detected. The person should see the screen.' 
                  : 'The person should see the screen.'}
              </p>
              <button
                onClick={() => {
                  setShowGazeAlertModal(false);
                  setSecondsLookingAway(0);
                  hasAlertedForLookAwayRef.current = false;
                  isAsymmetricActiveRef.current = false;
                  setIsSideViewing(false);
                  baselineCenterX.current = -1;
                  baselineCenterY.current = -1;
                  baselineSkinCount.current = -1;
                  setIsCalibrated(false);
                  setFaceAsymmetry(0);
                  setFaceSlant(0);
                  setDriftX(0);
                  setDriftY(0);
                  setLiveSkinCount(0);
                  setBaseSkinCount(0);
                  calibratedR.current = -1;
                  calibratedG.current = -1;
                  calibratedB.current = -1;
                  needsColorCalibration.current = true;
                  setCalibColor('N/A');
                }}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Dismiss Warning
              </button>
            </div>
          )}

          {showBlinkAlertModal && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-sm z-30 text-center animate-fade-in">
              <span className="material-symbols-outlined text-amber-500 text-3xl animate-bounce mb-xs">visibility</span>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Stare Warning!</h5>
              <p className="text-[9px] text-slate-300 mt-1 mb-sm px-xs font-semibold">
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
        <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold font-mono flex-wrap gap-x-sm">
          <span>EYE DELTA: {calibrationDiff}</span>
          <span>CALIB: {isCalibrated ? 'OK' : 'PENDING'}</span>
          <span>RGB: {calibColor}</span>
          <span>ASYM: {faceAsymmetry}</span>
          <span>SLANT: {faceSlant}</span>
          <span>DRIFT: X:{driftX} Y:{driftY}</span>
          <span>SKIN: {liveSkinCount}/{baseSkinCount}</span>
          <span>THRESHOLD: {blinkThreshold}</span>
        </div>

        {/* Manual controls */}
        <div className="pt-xs flex flex-col gap-xs">
          {isCameraActive && (
            <button
              onClick={() => {
                baselineCenterX.current = -1;
                baselineCenterY.current = -1;
                baselineSkinCount.current = -1;
                setIsCalibrated(false);
                setFaceAsymmetry(0);
                setFaceSlant(0);
                setDriftX(0);
                setDriftY(0);
                setLiveSkinCount(0);
                setBaseSkinCount(0);
                calibratedR.current = -1;
                calibratedG.current = -1;
                calibratedB.current = -1;
                needsColorCalibration.current = true;
                setCalibColor('N/A');
              }}
              className="w-full py-1 bg-secondary hover:bg-secondary/90 text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
            >
              Recalibrate Face Center
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
