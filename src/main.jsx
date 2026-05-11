import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './global/i18n.ts'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import { GlobalProvider } from "./global/GlobalContext.tsx";

console.log('Build time', __BUILD_TIME__)

const meta = {
  "salt": [119,102,201,53,62,41,51,32,250,78,237,244,192,153,239,12],
  "iv": [209,252,148,180,174,105,119,59,70,163,16,20],
  "data": [101,67,194,234,103,145,215,37,86,134,177,187,187,59,171,84,217,213,127,76,222,199,15,81,108,201,122,74,73,129,150,82,52,239,244,221,100,209,86,164,175,234,92,138,25,50,231,221,63,6,177,220,147,209,192,128,209,223,249,34,2,131,200,247,243,89,166,185,171,79,168,214,99,207,13,72]
}

async function getKey(password, salt) {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
  "raw",
  enc.encode(password),
{ name: "PBKDF2" },
  false,
  ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
{
  name: "PBKDF2",
  salt,
  iterations: 100000,
  hash: "SHA-256"
},
  keyMaterial,
{ name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
  );
}

// async function encrypt(text, password) {
//   const enc = new TextEncoder();
//
//   const salt = crypto.getRandomValues(new Uint8Array(16));
//   const iv = crypto.getRandomValues(new Uint8Array(12));
//
//   const key = await getKey(password, salt);
//
//   const encrypted = await crypto.subtle.encrypt(
// { name: "AES-GCM", iv },
//   key,
//   enc.encode(text)
//   );
//
//   return {
//   salt: Array.from(salt),
//   iv: Array.from(iv),
//   data: Array.from(new Uint8Array(encrypted))
// };
// }

async function decrypt(payload, password) {
  const dec = new TextDecoder();

  const key = await getKey(
  password,
  new Uint8Array(payload.salt)
  );

  const decrypted = await crypto.subtle.decrypt(
{
  name: "AES-GCM",
  iv: new Uint8Array(payload.iv)
},
  key,
  new Uint8Array(payload.data)
  );

  return dec.decode(decrypted);
}

const mount = (node) => {
  return createRoot(document.getElementById(node)).render(
    <StrictMode>
      <GlobalProvider>
        <App />
      </GlobalProvider>
    </StrictMode>,
  );
}
if (import.meta.env.DEV) {
  mount('root');
} else {
  decrypt(meta, window.location.hostname).then(_ => {
    const res = JSON.parse(_);
    if (res.author === 'juggernaut') {
      const d = (Date.now() - res.build) / 1000 / 60 / 60 / 24;
      if (d < 60) mount(res.mount);
    }
  })
}
