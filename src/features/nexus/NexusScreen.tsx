import React, { useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { Orb } from './components/Orb';
import { Greeting } from './components/Greeting';
import { MessageBubble } from './components/MessageBubble';
import { InputDock } from './components/InputDock';
import { QuickSuggest } from './components/QuickSuggest';
import { useChatSession } from './hooks/useChatSession';
import { useParticleRef } from '@/state/particleContext';
import { useKeyboardHeight } from '@/utils/useKeyboardHeight';
import { useNexusStore } from '@/state/nexusStore';

const ORB_WRAP = 220;
const ANIM = { duration: 380, easing: Easing.out(Easing.cubic) };

// Use physical screen height — window height shrinks on Android adjustResize causing double-jump
const SCREEN_H = Dimensions.get('screen').height;

export function NexusScreen() {
  const screenH = SCREEN_H;
  const particleRef = useParticleRef();
  const flatListRef = useRef<FlatList>(null);
  const { messages, orbActive, inputText, setInputText, sendMessage } = useChatSession();
  const keyboardHeight = useKeyboardHeight();
  const clearMessages = useNexusStore((s) => s.clearMessages);

  const hasMessages = messages.length > 0;

  const orbTranslateY = useSharedValue(0);
  const orbScale = useSharedValue(1);

  useEffect(() => {
    particleRef?.current?.setActive(orbActive);
  }, [orbActive, particleRef]);

  useEffect(() => {
    // Chat mode: animate orb to top-area; otherwise keep centered minus keyboard lift
    const chatShift = hasMessages ? -(screenH / 2 - 96 - ORB_WRAP / 2) : 0;
    const kbShift = -keyboardHeight * 0.55;
    const totalY = chatShift + kbShift;

    orbTranslateY.value = withTiming(totalY, ANIM);
    orbScale.value = withTiming(hasMessages ? 0.62 : 1.0, ANIM);
    particleRef?.current?.setOrbOffset(totalY);
  }, [hasMessages, keyboardHeight]);

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: orbTranslateY.value },
      { scale: orbScale.value },
    ],
  }));

  const handleSend = () => {
    sendMessage((x, y) => particleRef?.current?.pulse(x, y));
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleChipSelect = (text: string) => {
    setInputText(text);
  };

  // Transcript top: just below the small orb in chat mode
  const orbBottom = screenH / 2 - ORB_WRAP / 2 + (hasMessages ? -(screenH / 2 - 96 - ORB_WRAP / 2) : 0) + ORB_WRAP * (hasMessages ? 0.62 : 1.0);
  const transcriptTop = Math.round(orbBottom + 12);

  return (
    <View style={styles.screen}>
      {/* Greeting — visible when no messages */}
      {!hasMessages && <Greeting hidden={keyboardHeight > 0} />}

      {/* Orb centrepiece */}
      <Animated.View style={[styles.orbWrap, orbAnimStyle]}>
        <Orb active={orbActive} />
      </Animated.View>

      {/* Chat transcript */}
      {hasMessages && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.transcript}
          style={[styles.transcriptList, {
            top: transcriptTop,
            bottom: 80 + keyboardHeight,
          }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {/* Quick suggest chips */}
      {inputText.length === 0 && !hasMessages && (
        <QuickSuggest onSelect={handleChipSelect} bottomInset={keyboardHeight} />
      )}

      {/* Input dock */}
      <InputDock
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        disabled={orbActive}
        bottomInset={keyboardHeight}
        showNewSession={hasMessages}
        onNewSession={clearMessages}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrap: {
    width: ORB_WRAP,
    height: ORB_WRAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptList: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  transcript: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
