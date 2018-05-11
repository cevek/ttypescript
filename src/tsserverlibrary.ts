import * as tssl from 'typescript/lib/tsserverlibrary';
import { patchCreateProgram } from './patchCreateProgram';

patchCreateProgram(tssl);
export = tssl;
