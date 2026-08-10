import { NhostClient } from '@nhost/nhost-js';
import { LocalStorage } from 'node-localstorage';

const ls = new LocalStorage('./.tmp-ls');
globalThis.localStorage = ls;
globalThis.window = { addEventListener: () => {}, localStorage: ls };

const nhost = new NhostClient({ subdomain: 'local', start: true });
await new Promise(r => setTimeout(r, 400));
await nhost.auth.signIn({ email: 'alice@acme.test', password: 'DevPass12345!' });
await new Promise(r => setTimeout(r, 400));

const user = nhost.auth.getUser();
const acme = '3dae6375-344d-4864-a03f-d667919e80a2';
const { data, error } = await nhost.graphql.request(`
  mutation CreateWorkflow($org_id: uuid!, $name: String!, $created_by: uuid!) {
    insert_workflows_one(object: { org_id: $org_id, name: $name, created_by: $created_by }) { id name org_id }
  }`, { org_id: acme, name: 'Untitled workflow', created_by: user?.id });
console.log('create:', error ? 'ERR ' + JSON.stringify(error).slice(0,200) : JSON.stringify(data));

const { data: view } = await nhost.graphql.request(`query { workflows(where: { id: { _eq: "${data.insert_workflows_one.id}" } }) { id name org_id created_by } }`);
console.log('view:', JSON.stringify(view));
