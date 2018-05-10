import * as tssl from 'typescript/lib/tsserverlibrary';
import { patchCreateProgram } from './patchCreateProgram';

export = patchCreateProgram(tssl);
