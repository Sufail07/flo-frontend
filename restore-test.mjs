import { NhostClient } from '@nhost/nhost-js';
import { LocalStorage } from 'node-localstorage';

const ls = new LocalStorage('./.tmp-ls');
globalThis.localStorage = ls;
globalThis.window = { addEventListener: () => {}, localStorage: ls };

const nhost1 = new NhostClient({ subdomain: 'local', start: true });
await new Promise(r => setTimeout(r, 400));
await nhost1.auth.signIn({ email: 'alice@acme.test', password: 'DevPass12345!' });
await new Promise(r => setTimeout(r, 400));
console.log('sign-in done, token:', !!nhost1.auth.getAccessToken());

const keys = Object.keys(ls).filter(k => k.includes('nhost')).map(k => k);
console.log('stored keys:', keys.slice(0, 10));

const nhost2 = new NhostClient({ subdomain: 'local', start: true });
await new Promise(r => setTimeout(r, 1500));
console.log('nhost2 isAuthenticated:', nhost2.auth.isAuthenticated());
console.log('nhost2 graphql token set:', !!nhost2.graphql.accessToken);

const { data, error } = await nhost2.graphql.request(`query { org_members { org_id role } }`);
console.log('nhost2 org_members:', error ? 'ERR ' + JSON.stringify(error).slice(0,200) : JSON.stringify(data));
