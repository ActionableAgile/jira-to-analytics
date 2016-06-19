import { expect } from 'chai';
import { getHeaders, status } from '../../../lib/core/http';

describe('http core', () => {
  describe('headers', () => {
    it('should be added correctly with no basic auth', () => {
      const headers = getHeaders();
      expect(headers.get('accept')).to.equal('application/json');
      expect(headers.get('authorization')).to.not.exist;
    });

    it('should be added correctly with basic auth', () => {
      const headers = getHeaders('test_username', 'test_password');
      expect(headers.get('accept')).to.equal('application/json');
      expect(headers.get('authorization')).to.equal('Basic dGVzdF91c2VybmFtZTp0ZXN0X3Bhc3N3b3Jk');
    });
  });

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
