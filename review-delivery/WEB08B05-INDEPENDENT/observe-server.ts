import {installReviewPathAdapter} from './windows-review-adapter';
await installReviewPathAdapter();
const {createExperienceServer}=await import('../../research-evidence/aramco-research-experience/server');
const server=await createExperienceServer('http://127.0.0.1:5179');
const port=await server.listenLocal(4491);
console.log(JSON.stringify({mode:'INSTRUMENTED_REVIEW_ONLY',delivery:'3681aa0d084f31fc6bc6e05faa4c75db13b7b855',url:'http://127.0.0.1:'+port+'/?lang=ar',serverHandler:'Original delivery server.ts unchanged; only CSS compilation base path adapted in memory'}));
