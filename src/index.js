import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './AuthContext'; // <--- NUEVO: Importa AuthProvider
import { BrowserRouter as Router } from 'react-router-dom'; // Asegúrate de que Router esté importado

// Registrar Service Worker de Firebase de forma opcional (no bloquea la app si falla)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registrado exitosamente:', registration.scope);
      })
      .catch((error) => {
        console.warn('Service Worker no pudo registrarse (no crítico):', error);
        // No bloquear la app si el Service Worker falla
      });
  });
}

// Evita que el scroll del mouse cambie el valor de un <input type="number">
// con foco -- comportamiento nativo de Chrome/Edge/Safari (no es un bug de
// esta app), pero varios clientes reportaron que al scrollear la página con
// el cursor arriba de un campo de monto cargado, el valor se les modificaba
// solo sin que se dieran cuenta. Blur global en captura, antes de que el
// navegador aplique su +/-1 por defecto -- cubre todos los inputs numéricos
// de la app sin tener que tocarlos uno por uno.
document.addEventListener('wheel', (e) => {
  const el = e.target;
  if (el && el.tagName === 'INPUT' && el.type === 'number' && document.activeElement === el) {
    el.blur();
  }
}, { passive: true, capture: true });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router> {/* Si no lo tenías, envuelve aquí */}
      <AuthProvider> {/* <--- NUEVO: Envuelve App con AuthProvider */}
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();