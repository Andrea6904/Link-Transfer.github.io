// screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveConnection, verifyPin, clearConnection } from '../services/connection';

export default function SettingsScreen({ connection, connected, onConnected }) {
  const [ip, setIp] = useState(connection?.ip || '');
  const [port, setPort] = useState(String(connection?.port || '4000'));
  const [pin, setPin] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleConnectWithPin() {
    try {
      const { token } = await verifyPin(ip, port, pin);
      const conn = { ip, port, token };
      await saveConnection(conn);
      onConnected(conn);
    } catch (err) {
      Alert.alert('Error de emparejamiento', err.message);
    }
  }

  async function handleScan({ data }) {
    setScanMode(false);
    try {
      const payload = JSON.parse(data); // { ip, port, token }
      const conn = { ip: payload.ip, port: String(payload.port), token: payload.token };
      await saveConnection(conn);
      onConnected(conn);
    } catch (err) {
      Alert.alert('QR inválido', 'No se pudo leer el código escaneado.');
    }
  }

  async function handleDisconnect() {
    await clearConnection();
    onConnected(null);
  }

  if (scanMode) {
    if (!permission?.granted) {
      requestPermission();
      return <View style={styles.container}><Text>Solicitando permiso de cámara...</Text></View>;
    }
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
        <Button title="Cancelar escaneo" onPress={() => setScanMode(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes de conexión</Text>

      <View style={styles.statusRow}>
        <Text>Estado: </Text>
        <Text style={{ color: connected ? 'green' : 'red', fontWeight: 'bold' }}>
          {connected ? 'Conectado' : 'Desconectado'}
        </Text>
      </View>

      <Button title="Escanear código QR de la PC" onPress={() => setScanMode(true)} />

      <Text style={styles.orText}>— o ingresa los datos manualmente —</Text>

      <TextInput
        style={styles.input}
        placeholder="IP de la PC (ej. 192.168.1.10)"
        value={ip}
        onChangeText={setIp}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Puerto (ej. 4000)"
        value={port}
        onChangeText={setPort}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="PIN de 4 dígitos"
        value={pin}
        onChangeText={setPin}
        keyboardType="numeric"
        maxLength={4}
      />

      <Button title="Conectar" onPress={handleConnectWithPin} />

      {connection && (
        <View style={{ marginTop: 24 }}>
          <Button title="Olvidar este servidor" color="#b91c1c" onPress={handleDisconnect} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  statusRow: { flexDirection: 'row', marginBottom: 12 },
  orText: { textAlign: 'center', marginVertical: 12, color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
});
