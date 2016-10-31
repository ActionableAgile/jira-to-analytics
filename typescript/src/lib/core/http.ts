import 'isomorphic-fetch';
import * as request from 'request';
import * as fs from 'fs';

const getHeaders = (username?: string, password?: string): Headers => {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  if (username && password) {
    headers.append('Authorization', `Basic ${new Buffer(username + ':' + password).toString('base64')}`);
  }
  return headers;
};

const status = (response: IResponse): Promise<any> => {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response);
  } else {
    return Promise.reject(new Error(`${response.status} : ${response.statusText} at ${response.url}`));
  }
};

const convertToJson = (response: IResponse): Promise<IResponse> => {
  return response.json();
};

const getJsonFromUrlViaOauth = (url, oauth): Promise<any> => {
  return new Promise((accept, reject) => {
    request.get({
      url,
      oauth: oauth,
      json: true,
    }, (error, response, body) => {
      if (error) {
        console.log(`Error fetching json from ${url}`);
        reject(new Error(error));
      } else {
        accept(body);
      } 
    });
  });
};

const getJsonFromSelfSignedSSLUrl = (url, username, password) => {
  return new Promise((accept, reject) => {
    request.get(url, {
      'auth': {
        'user': username,
        'pass': password,
        'sendImmediately': false
      },
      agentOptions: {
        ca: fs.readFileSync('ca.cert.pem')
      },
      json: true,
    }, (error, response, body) => {
      if (error) {
        console.log(`Error fetching json from ${url}`);
        reject(new Error(error));
      } else {
        accept(body);
      };
    });
  });
};

const getJsonFromUrl = (url: string, headers: Headers): Promise<any> => {
  return fetch(url, { headers })
    .then(status)
    .then(convertToJson);
};

export {
    status,
    convertToJson,
    getHeaders,
    getJsonFromUrl,
    getJsonFromUrlViaOauth,
    getJsonFromSelfSignedSSLUrl,
};
