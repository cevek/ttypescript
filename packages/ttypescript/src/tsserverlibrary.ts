import * as TSSL from 'typescript/lib/tsserverlibrary';
import { loadTypeScript } from './loadTypescript';

const tssl = loadTypeScript('tsserverlibrary') as typeof TSSL;
export = tssl;
