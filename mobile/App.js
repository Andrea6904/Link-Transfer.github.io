// App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

import ChatScreen from './screens/ChatScreen';
import FilesScreen from './screens/FilesScreen';
import SettingsScreen from './screens/SettingsScreen';
import { loadConnection, connectSocket } from './services/connection';
import { requestNotificationPermissions } from './services/notifications';

const Tab = createBottomTabNavigator();

export default function App() {
  const [connection, setConnection] = useState(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    loadConnection().then((conn) => {
      if (conn) {
        setConnection(conn);
        connectSocket(conn, { onStatusChange: setConnected });
      }
      setReady(true);
    });
  }, []);

  function handleConnected(conn) {
    setConnection(conn);
    if (conn) {
      connectSocket(conn, { onStatusChange: setConnected });
    } else {
      setConnected(false);
    }
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
        <Tab.Screen name="Chat" options={{ title: connected ? 'Chat 🟢' : 'Chat 🔴' }}>
          {() => <ChatScreen connection={connection} />}
        </Tab.Screen>
        <Tab.Screen name="Archivos">
          {() => <FilesScreen connection={connection} />}
        </Tab.Screen>
        <Tab.Screen name="Ajustes">
          {() => (
            <SettingsScreen
              connection={connection}
              connected={connected}
              onConnected={handleConnected}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
