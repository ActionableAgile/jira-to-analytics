import { get } from 'request';
import { readFileSync, existsSync } from 'fs';
import { IAuth } from '../types';

const getJson = (url: string, auth: IAuth): Promise<any> => {
  return new Promise((accept, reject) => {
    const options = {
      url,
      json: true,
    };
    // HANDLE OAUTH
    if (auth.oauth && auth.oauth.private_key && auth.oauth.token) {
      const oauth = auth.oauth;
      Object.assign(options, { oauth });
    } else if (auth.username && auth.password) {
      // Handle Basic Auth
      const headers = {
        'Authorization': `Basic ${new Buffer(auth.username + ':' + auth.password).toString('base64')}`,
      };
      Object.assign(options, { headers });
    }
    // Handle Custom Self signed Cert
    if (existsSync('ca.cert.pem')) {
      const ca = readFileSync('ca.cert.pem');
      const agentOptions = { ca };
      Object.assign(options, { agentOptions });
    }
    get(options, (error, response, body) => {
      if (error) {
        console.log(`Error fetching json from ${url}`);
        reject(new Error(error));
      } else {
        if (typeof body === 'string') {
          if (body.includes('<title>Unauthorized (401)</title>')) {
            reject(new Error('Unauthorized'));
          }
        }
        accept(body);
      }
    });
  });
};

export {
  getJson,
};