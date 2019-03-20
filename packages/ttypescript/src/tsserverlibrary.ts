import * as TS from 'typescript';
import * as TSSL from 'typescript/lib/tsserverlibrary';
import { loadTypeScript } from './loadTypescript';

const ts = (loadTypeScript('tsserverlibrary') as unknown) as typeof TSSL;
export = ts;
