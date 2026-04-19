import React, { useRef } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { Orb } from './components/Orb';
import { Greeting } from './components/Greeting';
import { MessageBubble } from './components/MessageBubble';
import { InputDock } from './components/InputDock';
import { QuickSuggest } from './components/QuickSuggest';
import { useChatSession } from './hooks/useChatSession';
import { useParticleRef } from '@/state/particleContext';
import { useKeyboardHeight } from '@/utils/useKeyboardHeight';

export function NexusScreen() {
  const particleRef = useParticleRef();
  const flatListRef = useRef<FlatList>(null);
  const { messages, orbActive, inputText, setInputText, sendMessage } = useChatSession();
  const keyboardHeight = useKeyboardHeight();

  const handleSend = () => {
    sendMessage((x, y) => particleRef?.current?.pulse(x, y));
    // Scroll to bottom after new message appears
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleChipSelect = (text: string) => {
    setInputText(text);
  };

  return (
    <View style={styles.screen}>
      {/* Greeting — visible when no messages */}
      {messages.length === 0 && <Greeting />}

      {/* Orb centrepiece */}
      <View style={styles.orbWrap}>
        <Orb active={orbActive} />
      </View>

      {/* Chat transcript */}
      {messages.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.transcript}
          style={[styles.transcriptList, { bottom: 170 + keyboardHeight }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {/* Quick suggest chips — hidden when typing */}
      {inputText.length === 0 && messages.length === 0 && (
        <QuickSuggest onSelect={handleChipSelect} />
      )}

      {/* Input dock */}
      <InputDock
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        disabled={orbActive}
        bottomInset={keyboardHeight}
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
    position: 'relative',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptList: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxHeight: 130,
  },
  transcript: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
