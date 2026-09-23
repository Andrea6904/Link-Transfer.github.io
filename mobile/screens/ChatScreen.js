// screens/ChatScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getSocket, apiRequest } from '../services/connection';
import { notifyNewMessage } from '../services/notifications';
import { useFocusEffect } from '@react-navigation/native';

const SENDER = 'mobile';

export default function ChatScreen({ connection }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [screenFocused, setScreenFocused] = useState(true);
  const listRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!connection) return;

    apiRequest(connection, '/api/messages').then(setMessages).catch(() => {});

    const socket = getSocket();
    if (!socket) return;

    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.sender === 'pc' && !screenFocused) {
        notifyNewMessage(msg.content);
      }
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [connection, screenFocused]);

  function sendMessage() {
    const content = text.trim();
    if (!content) return;
    const socket = getSocket();
    socket?.emit('chat:message', { sender: SENDER, content });
    setText('');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === 'mobile' ? styles.mine : styles.theirs]}>
            <Text style={styles.bubbleText}>{item.content}</Text>
            <Text style={styles.meta}>{item.sender} · {item.created_at}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje..."
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, padding: 12 },
  bubble: { padding: 10, borderRadius: 10, marginBottom: 8, maxWidth: '80%' },
  mine: { backgroundColor: '#0ea5e9', alignSelf: 'flex-end' },
  theirs: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start' },
  bubbleText: { color: '#0f172a' },
  meta: { fontSize: 10, color: '#334155', marginTop: 4 },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 14, marginRight: 8 },
  sendBtn: { backgroundColor: '#0ea5e9', borderRadius: 20, paddingHorizontal: 16, justifyContent: 'center' },
});
