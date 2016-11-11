// import 'isomorphic-fetch';
import * as request from 'request';
import * as fs from 'fs';

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
      headers: {
        'Authorization': `Basic ${new Buffer(username + ':' + password).toString('base64')}`
      },
      // agentOptions: {
      //   ca: fs.readFileSync('ca.cert.pem')
      // },
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

export {
  getJsonFromUrlViaOauth,
  getJsonFromSelfSignedSSLUrl,
};
