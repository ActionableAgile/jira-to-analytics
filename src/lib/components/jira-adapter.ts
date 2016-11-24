import { get } from 'request';
import { readFileSync, existsSync } from 'fs';
import { IAuth } from '../types';

const getJson = (url: string, auth: IAuth): Promise<any> => {

  // ssl relaxing opts for request...
  // rejectUnauthorized: false,
  // requestCert: true,
  // agent: false,
  // strictSSL: false,


  return new Promise((accept, reject) => {
    const options = {
      url,
      json: true,
    };
    if (auth.oauth && auth.oauth.private_key && auth.oauth.token) {
      // Handle OAuth
      const oauth = auth.oauth;
      Object.assign(options, { oauth });
    } else if (auth.username && auth.password) {
      // Handle Basic Auth
      const headers = {
        'Authorization': `Basic ${new Buffer(auth.username + ':' + auth.password).toString('base64')}`,
      };
      Object.assign(options, { headers });
    }
    if (existsSync('ca.cert.pem')) {
      // Handle Custom Self signed Cert
      const cert = readFileSync('ca.cert.pem');
      const agentOptions = {
        ca: cert,
      };
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