import * as TS from 'typescript';
import * as TSSL from 'typescript/lib/tsserverlibrary';
import { loadTypeScript } from './loadTypescript';

export = loadTypeScript('tsserverlibrary') as typeof TSSL;
