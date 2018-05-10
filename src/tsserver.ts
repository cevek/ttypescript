// @ts-ignore
import * as tsServer from 'typescript/lib/tsserver';
import { patchCreateProgram } from './patchCreateProgram';

export = patchCreateProgram(tsServer);
