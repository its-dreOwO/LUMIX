import React, { useRef, useEffect, useState } from 'react';
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
import { SettingsSheet } from './components/SettingsSheet';
import { useChatSession } from './hooks/useChatSession';
import { useParticleRef } from '@/state/particleContext';
import { useKeyboardHeight } from '@/utils/useKeyboardHeight';
import { useNexusStore } from '@/state/nexusStore';

const ORB_WRAP = 220;
const ANIM = { duration: 380, easing: Easing.out(Easing.cubic) };

// Use physical screen height — window height shrinks on Android adjustResize causing double-jump
const SCREEN_H = Dimensions.get('screen').height;

export function NexusScreen() {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
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
    // Compact mode: there are any messages.
    // In compact mode, the orb minimizes and floats to the top.
    const inChatMode = hasMessages;
    
    // Default chat shift pushes it up near the header
    const chatShift = inChatMode ? -(screenH / 2 - 96 - ORB_WRAP / 2) : 0;
    
    // Idle (no messages) + keyboard up: lift orb just above keyboard so it isn't covered
    const kbShift = (!hasMessages && keyboardHeight > 0) ? -keyboardHeight * 0.55 : 0;
    
    const totalY = chatShift + kbShift;

    orbTranslateY.value = withTiming(totalY, ANIM);
    orbScale.value = withTiming(inChatMode ? 0.62 : 1.0, ANIM);
    particleRef?.current?.setOrbOffset(totalY);
  }, [hasMessages, keyboardHeight]);

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: orbTranslateY.value },
      { scale: orbScale.value },
    ],
  }));

  const handleSend = () => {
    sendMessage(); // removed pulse callback to satisfy removal of explosion on send
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleChipSelect = (text: string) => {
    setInputText(text);
  };

  // Transcript top follows the orb's actual rendered bottom.
  // inChatMode (messages exist): orb is compact at top → transcript starts just below it.
  // Otherwise: orb is centered.
  const inChatMode = hasMessages;
  const orbVisualBottom = inChatMode
    ? 96 + (ORB_WRAP * 0.62) / 2          // compact: top=96, half of scaled orb
    : screenH / 2 + ORB_WRAP / 2;         // centered: screenH/2 + half wrap
  const transcriptTop = Math.round(orbVisualBottom + 16);

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
            bottom: 76 + keyboardHeight,
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
        showNewSession={true}
        onNewSession={clearMessages}
        onOpenSettings={() => setIsSettingsVisible(true)}
      />

      {/* Settings Bottom Sheet */}
      <SettingsSheet 
        isVisible={isSettingsVisible} 
        onClose={() => setIsSettingsVisible(false)} 
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
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
