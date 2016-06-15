import 'isomorphic-fetch';

function getHeaders(username: string, password: string): Headers {
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  if (username && password) {
    headers.append('Authorization', `Basic ${new Buffer(username + ':' + password).toString('base64')}`);
  }
  return headers;
};

function status(response: IResponse): Promise<any> {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response);
  } else {
    console.log(response.status);
    return Promise.reject(new Error(response.statusText));
  }
};

function json(response: IResponse): Promise<IResponse> {
  return response.json();
};

function request(url: string, headers: Headers): Promise<any> {
  console.log(url);
  console.log(headers);
  return fetch(url, { headers })
    .then(status)
    .then(json)
    .then(json => Promise.resolve(json))
    .catch(error => Promise.reject(error));
};

export {
    status,
    json,
    request,
    getHeaders,
};