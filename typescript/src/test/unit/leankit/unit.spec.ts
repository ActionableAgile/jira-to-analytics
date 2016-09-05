// import { expect } from 'chai';
// import { LeanKitExtractor } from '../../../lib/extractors/leankit/main';

// describe('leankit', () => {
//   it('should get boards', () => {
//     const leanKitExtractor = new LeanKitExtractor();
//     leanKitExtractor.mockClient();
//     return leanKitExtractor.getBoards().then(boards => {
//       // console.log(boards);
//       expect((boards).length).to.equal(1);
//     });
//   });

//   it('should get board info', () => {
//     const leanKitExtractor = new LeanKitExtractor();
//     leanKitExtractor.mockClient();
//     return leanKitExtractor.getBoardInformation(372745438).then(boardInfo => {
//       // console.log(boardInfo);
//       expect(boardInfo).to.not.be.null;
//     });
//   });

//   // it('should get blah', () => {
//   //   const leanKitExtractor = new LeanKitExtractor();
//   //   leanKitExtractor.mockClient();
//   //   return leanKitExtractor.driver().then(boardHistory => {
//   //     // console.log(boardInfo);
//   //     expect(boardHistory).to.not.be.null;
//   //   });
//   // });

//   it('should get blah', () => {
//     const leanKitExtractor = new LeanKitExtractor();
//     leanKitExtractor.mockClient();
//     return leanKitExtractor.driver().then(boardHistory => {
//       // console.log(boardInfo);
//       expect(boardHistory).to.not.be.null;
//     });
//   });
// });