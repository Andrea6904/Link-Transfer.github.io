// screens/FilesScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getSocket, apiRequest, getBaseUrl } from '../services/connection';
import { notifyNewFile } from '../services/notifications';
import { useFocusEffect } from '@react-navigation/native';

export default function FilesScreen({ connection }) {
  const [files, setFiles] = useState([]);
  const [screenFocused, setScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  useEffect(() => {
    if (!connection) return;
    apiRequest(connection, '/api/files').then(setFiles).catch(() => {});

    const socket = getSocket();
    if (!socket) return;
    const handler = (file) => {
      setFiles((prev) => [file, ...prev]);
      if (file.sender === 'pc' && !screenFocused) {
        notifyNewFile(file.original_name);
      }
    };
    socket.on('file:new', handler);
    return () => socket.off('file:new', handler);
  }, [connection, screenFocused]);

  async function pickAndUpload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'image/*', 'application/pdf', 'application/zip',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('sender', 'mobile');
    formData.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
    });

    try {
      await fetch(`${getBaseUrl(connection)}/api/files/upload`, {
        method: 'POST',
        headers: { 'x-pairing-token': connection.token, 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
    } catch (err) {
      Alert.alert('Error', 'No se pudo subir el archivo.');
    }
  }

  async function downloadFile(file) {
    try {
      const dest = FileSystem.documentDirectory + file.original_name;
      const url = `${getBaseUrl(connection)}/api/files/download/${file.stored_name}?x-pairing-token=${connection.token}`;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      Alert.alert('Descargado', `Guardado en: ${uri}`);
    } catch (err) {
      Alert.alert('Error', 'No se pudo descargar el archivo.');
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUpload}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Subir archivo a la PC</Text>
      </TouchableOpacity>

      <FlatList
        data={files}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fileName}>{item.original_name}</Text>
              <Text style={styles.fileMeta}>{item.sender} · {(item.size_bytes / 1024).toFixed(1)} KB</Text>
            </View>
            <TouchableOpacity onPress={() => downloadFile(item)}>
              <Text style={styles.downloadLink}>Descargar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  uploadBtn: {
    backgroundColor: '#0ea5e9', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#eee',
  },
  fileName: { fontWeight: '600' },
  fileMeta: { color: '#666', fontSize: 12 },
  downloadLink: { color: '#0ea5e9', fontWeight: 'bold' },
});
