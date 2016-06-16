import { expect } from 'chai';
import { getHeaders, status } from '../../../lib/core/http';

describe('http core', () => {
  describe('status code', () => {
    it('should accept a 200', () => {
      const testResponse = createFakeResponse(200, 'LGTM')
      return status(testResponse)
        .then(function(response) {
          expect(response.statusText).to.equal('LGTM');
          expect(response.status).to.equal(200);
        });
    });
    it('should reject a 400', () => {
      const testResponse = createFakeResponse(400, 'Got a 400')
      return status(testResponse)
        .catch((errorResponse: Error) => {
          expect(errorResponse.message).to.equal('400:Got a 400');
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
