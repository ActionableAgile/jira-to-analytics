import 'isomorphic-fetch';

function getHeaders(username?: string, password?: string): Headers {
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
    return Promise.reject(new Error(response.status + ':' + response.statusText));
  }
};

function convertToJson(response: IResponse): Promise<IResponse> {
  return response.json();
};

function getJsonFromUrl(url: string, headers: Headers): Promise<any> {
  return fetch(url, { headers })
    .then(status)
    .then(convertToJson);
};

export {
    status,
    convertToJson,
    getHeaders,
    getJsonFromUrl,
};

// todo work on error handling