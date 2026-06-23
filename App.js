/**
 * BrailleScanner - Expo React Native App
 * ----------------------------------------
 * A fully accessible Braille document scanner for visually impaired users.
 * Uses expo-camera, expo-speech, and expo-haptics.
 *
 * App States:
 *   1. PERMISSION  → Ask for camera permission
 *   2. CAMERA      → Idle camera view, tap anywhere to scan
 *   3. PROCESSING  → Dark overlay + spinner while mock ML runs
 *   4. RESULTS     → Large-text result + "Scan Again" button
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  background: '#0A0A0F',
  surface: '#13131A',
  accent: '#4F8EF7',
  accentDark: '#1A3A6B',
  success: '#2ECC71',
  white: '#FFFFFF',
  offWhite: '#E8E8F0',
  muted: '#8888AA',
  overlay: 'rgba(10, 10, 15, 0.88)',
  scanBorder: 'rgba(79, 142, 247, 0.7)',
};

const SPEECH_MSGS = {
  cameraReady:
    'Camera ready. Tap anywhere on the screen to capture the Braille document.',
  scanning: 'Scanning document. Please wait.',
  permissionNeeded:
    'Camera permission is required. Tap the button to grant access.',
};

// ─────────────────────────────────────────────
// Mock ML Backend
// ─────────────────────────────────────────────
const mockTranslateBraille = (imageUri) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        'Hello, this is a test for the Braille translation. ' +
          'The document reads: Welcome to the Braille Scanner application. ' +
          'We hope this tool helps you access written content with ease.'
      );
    }, 2000);
  });

// ─────────────────────────────────────────────
// Utility: speak with stop-first guard
// ─────────────────────────────────────────────
const speak = (text, options = {}) => {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.0, ...options });
};

// ─────────────────────────────────────────────
// Component: PermissionScreen
// ─────────────────────────────────────────────
const PermissionScreen = ({ onRequest }) => {
  useEffect(() => {
    speak(SPEECH_MSGS.permissionNeeded);
  }, []);

  return (
    <SafeAreaView style={styles.permissionContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.permissionInner}>
        {/* Icon */}
        <View style={styles.permissionIconWrap}>
          <Text style={styles.permissionIcon}>📷</Text>
        </View>

        <Text style={styles.permissionTitle}>Camera Access{'\n'}Required</Text>
        <Text style={styles.permissionSubtitle}>
          Braille Scanner needs your camera to capture and translate Braille
          documents.
        </Text>

        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={onRequest}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
          accessibilityHint="Tap to allow Braille Scanner to use your camera"
          activeOpacity={0.75}
        >
          <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
// Component: ProcessingOverlay
// ─────────────────────────────────────────────
const ProcessingOverlay = () => (
  <View
    style={styles.overlay}
    accessible
    accessibilityLiveRegion="polite"
    accessibilityLabel="Processing. Scanning document, please wait."
  >
    <View style={styles.overlayCard}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.overlayTitle}>Scanning…</Text>
      <Text style={styles.overlaySubtitle}>Translating Braille document</Text>

      {/* Animated dots row */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.3 }]} />
        ))}
      </View>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// Component: ResultsScreen
// ─────────────────────────────────────────────
const ResultsScreen = ({ translatedText, onScanAgain }) => {
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak(translatedText);
    return () => Speech.stop();
  }, [translatedText]);

  const handleScanAgain = async () => {
    Speech.stop();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScanAgain();
  };

  const handleReplay = async () => {
    await Haptics.selectionAsync();
    speak(translatedText);
  };

  return (
    <SafeAreaView style={styles.resultsContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header badge */}
      <View style={styles.resultsBadge}>
        <Text style={styles.resultsBadgeIcon}>✓</Text>
        <Text style={styles.resultsBadgeText}>Translation Complete</Text>
      </View>

      {/* Scrollable translated text */}
      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={styles.resultsScrollContent}
        accessible
        accessibilityLabel="Translated text area"
      >
        <Text
          style={styles.translatedText}
          accessibilityRole="text"
          accessible
          accessibilityLabel={`Translated text: ${translatedText}`}
        >
          {translatedText}
        </Text>
      </ScrollView>

      {/* Replay button */}
      <TouchableOpacity
        style={styles.replayBtn}
        onPress={handleReplay}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Replay audio"
        accessibilityHint="Tap to hear the translated text again"
        activeOpacity={0.75}
      >
        <Text style={styles.replayBtnText}>🔊  Replay Audio</Text>
      </TouchableOpacity>

      {/* Scan Again button — 30% of screen height */}
      <TouchableOpacity
        style={styles.scanAgainBtn}
        onPress={handleScanAgain}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Scan Again"
        accessibilityHint="Tap to clear results and capture a new Braille document"
        activeOpacity={0.8}
      >
        <Text style={styles.scanAgainIcon}>↩</Text>
        <Text style={styles.scanAgainText}>Scan Again</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
// Component: CameraScreen
// ─────────────────────────────────────────────
const CameraScreen = ({ onCapture }) => {
  const cameraRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => speak(SPEECH_MSGS.cameraReady), 600);
    return () => {
      clearTimeout(timer);
      Speech.stop();
    };
  }, []);

  const handlePress = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      let imageUri = null;
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: true,
        });
        imageUri = photo.uri;
      }
      onCapture(imageUri);
    } catch (err) {
      console.warn('Capture error:', err);
      // Still proceed with mock even if capture fails
      onCapture(null);
    }
  }, [isCapturing, onCapture]);

  return (
    <View style={styles.cameraContainer}>
      <StatusBar hidden />

      {/* Full-screen tappable wrapper */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handlePress}
        activeOpacity={1}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Capture Braille document"
        accessibilityHint="Tap anywhere on the screen to scan the Braille document in front of the camera"
      >
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          flash="off"
        />

        {/* Corner brackets as scan guide */}
        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* Bottom hint bar */}
        <View style={styles.cameraHint} pointerEvents="none">
          <Text style={styles.cameraHintText}>
            Tap anywhere to scan Braille
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// ─────────────────────────────────────────────
// Root App Component
// ─────────────────────────────────────────────
export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [appState, setAppState] = useState('CAMERA'); // CAMERA | PROCESSING | RESULTS
  const [translatedText, setTranslatedText] = useState('');

  // ── Handle capture: transition to PROCESSING then RESULTS
  const handleCapture = useCallback(async (imageUri) => {
    setAppState('PROCESSING');
    speak(SPEECH_MSGS.scanning);

    try {
      const result = await mockTranslateBraille(imageUri);
      setTranslatedText(result);
      setAppState('RESULTS');
    } catch (err) {
      console.error('Translation error:', err);
      speak('An error occurred. Please try again.');
      setAppState('CAMERA');
    }
  }, []);

  // ── Reset to camera state
  const handleScanAgain = useCallback(() => {
    setTranslatedText('');
    setAppState('CAMERA');
    // Small delay so the camera mounts before speech fires
    setTimeout(() => speak(SPEECH_MSGS.cameraReady), 700);
  }, []);

  // ── Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // ── Permission denied
  if (!permission.granted) {
    return <PermissionScreen onRequest={requestPermission} />;
  }

  // ── Main state machine
  return (
    <View style={styles.root}>
      {appState === 'RESULTS' ? (
        <ResultsScreen
          translatedText={translatedText}
          onScanAgain={handleScanAgain}
        />
      ) : (
        <>
          <CameraScreen onCapture={handleCapture} />
          {appState === 'PROCESSING' && <ProcessingOverlay />}
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Permission Screen
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  permissionIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  permissionIcon: {
    fontSize: 52,
  },
  permissionTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: 0.3,
  },
  permissionSubtitle: {
    fontSize: 18,
    color: COLORS.offWhite,
    textAlign: 'center',
    lineHeight: 28,
    marginHorizontal: 8,
  },
  permissionBtn: {
    marginTop: 16,
    width: '100%',
    paddingVertical: 22,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  permissionBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  // ── Camera Screen
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Scan-frame corner brackets
  scanFrame: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.18,
    left: SCREEN_WIDTH * 0.08,
    right: SCREEN_WIDTH * 0.08,
    bottom: SCREEN_HEIGHT * 0.22,
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: COLORS.scanBorder,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },

  // Bottom hint
  cameraHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(10,10,15,0.72)',
    alignItems: 'center',
  },
  cameraHintText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.offWhite,
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  // ── Processing Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(79,142,247,0.25)',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 15,
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  overlaySubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },

  // ── Results Screen
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLORS.success,
    gap: 8,
  },
  resultsBadgeIcon: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: '800',
  },
  resultsBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 0.5,
  },
  resultsScroll: {
    flex: 1,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  resultsScrollContent: {
    paddingVertical: 16,
  },
  translatedText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 44,
    letterSpacing: 0.4,
  },

  // Replay button
  replayBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.accentDark,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  replayBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.4,
  },

  // Scan Again button — ~30% screen height
  scanAgainBtn: {
    height: SCREEN_HEIGHT * 0.3,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  scanAgainIcon: {
    fontSize: 40,
    color: COLORS.white,
  },
  scanAgainText: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
});
