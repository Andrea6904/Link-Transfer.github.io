// services/notifications.js
// Notificaciones locales: se disparan cuando llega un mensaje o archivo nuevo
// desde la PC mientras el usuario no está mirando esa pantalla.

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notifyNewMessage(content) {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Nuevo mensaje de la PC', body: content },
    trigger: null,
  });
}

export async function notifyNewFile(fileName) {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Nuevo archivo recibido', body: fileName },
    trigger: null,
  });
}
