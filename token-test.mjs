import { NhostClient } from '@nhost/nhost-js';
import { LocalStorage } from 'node-localstorage';

globalThis.localStorage = new LocalStorage('./.tmp-ls');
globalThis.window = { addEventListener: () => {}, localStorage: globalThis.localStorage };

const nhost = new NhostClient({ subdomain: 'local', start: true });
await new Promise(r => setTimeout(r, 500));

console.log('initial isAuthenticated:', nhost.auth.isAuthenticated());

const { error } = await nhost.auth.signIn({ email: 'alice@acme.test', password: 'DevPass12345!' });
console.log('signIn error:', error?.message ?? 'none');
await new Promise(r => setTimeout(r, 800));
console.log('after signIn isAuthenticated:', nhost.auth.isAuthenticated());
console.log('accessToken present:', !!nhost.auth.getAccessToken());
console.log('graphql client headers:', JSON.stringify(nhost.graphql.getHeaders()));
console.log('graphql client accessToken set:', !!nhost.graphql.accessToken);

const { data, error: gerr } = await nhost.graphql.request(`query { org_members { org_id role } }`);
console.log('graphql org_members:', gerr ? 'ERR ' + JSON.stringify(gerr).slice(0,250) : JSON.stringify(data));
