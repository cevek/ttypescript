import * as tssl from 'typescript/lib/tsserverlibrary';
import { patchCreateProgram } from './patchCreateProgram';

patchCreateProgram(tssl as any);
export = tssl;
