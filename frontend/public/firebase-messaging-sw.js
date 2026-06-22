/* eslint-disable no-restricted-globals */

// Firebase Cloud Messaging Service Worker
// Este archivo permite recibir notificaciones push en segundo plano
// (cuando la pestaña no está activa o el navegador está minimizado)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase (mismos valores que en firebase.ts)
firebase.initializeApp({
  apiKey: "AIzaSyAIivPA6RNBLJggLJsvkP-IdBVRlmIL1-s",
  authDomain: "kani-deportes.firebaseapp.com",
  projectId: "kani-deportes",
  storageBucket: "kani-deportes.firebasestorage.app",
  messagingSenderId: "272963219973",
  appId: "1:272963219973:web:df6a049e2ab9f21735e26c"
});

const messaging = firebase.messaging();

// Handler para notificaciones recibidas en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Notificación en segundo plano recibida:', payload);

  const notificationTitle = payload.notification?.title || 'Kani Deportes';
  const notificationOptions = {
    body: payload.notification?.body || 'Tenés una nueva notificación',
    icon: '/logo192.png',
    badge: '/favicon-32x32.png',
    tag: payload.data?.notificacionId || 'default',
    data: payload.data || {},
    // Vibración: patrón corto-largo-corto
    vibrate: [100, 200, 100],
    actions: [
      {
        action: 'open',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para cuando el usuario hace clic en la notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event);

  event.notification.close();

  // Si el usuario hizo clic en "Cerrar", no hacer nada más
  if (event.action === 'close') return;

  // Abrir o enfocar la ventana de la app
  const urlToOpen = '/notificaciones';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
