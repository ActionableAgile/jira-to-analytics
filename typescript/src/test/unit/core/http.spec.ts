import { expect } from 'chai';
import { getHeaders, status } from '../../../lib/core/http';

describe('http core', () => {
  describe('header creator', () => {
    // it('should create valid headers for JSON with basic auth', () => {
    //   const username = 'foo';
    //   const password = 'bar';
    //
    //   const headers = getHeaders(username, password);
    //   // btoa is not defined? todo look into this
    //   expect(headers.get('Authentication')).to.be(`Basic ${btoa(username + ':' + password)}`);
    //   expect(headers.get('Accept')).to.be('application/json');
    // });
  });
  describe('status code', () => {
    it('should accept a 200', (done) => {
      const testResponse = createFakeResponse(200, 'LGTM')
      status(testResponse).then(done());
    });
    it('should reject a 400', (done) => {
      const testResponse = createFakeResponse(400, 'Got a 400')
      status(testResponse).catch((error: Error) => {
        expect(error.message).to.equal('Got a 400');
        done();
      });
    });
  });
});

const createFakeResponse = (status: number, statusText: string, url: string = '', ok: boolean = true) => {
  const testResponse: IResponse = {
    url,
    status,
    statusText,
    ok,
    headers: null,
    type: null,
    size: null,
    timeout: null,
    redirect: null,
    error: null,
    clone: null,
    bodyUsed: null,
    arrayBuffer: null,
    blob: null,
    formData: null,
    json: null,
    text: null,
  };
  return testResponse;
};
