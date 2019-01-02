import * as TS from 'typescript';
import * as TSSL from 'typescript/lib/tsserverlibrary';
import { loadTypeScript } from './loadTypescript';

const ts = loadTypeScript('tsserverlibrary') as typeof TSSL;
export = ts;
