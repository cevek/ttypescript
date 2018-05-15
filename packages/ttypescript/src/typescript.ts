import * as ts from 'typescript/lib/typescript';
import { patchCreateProgram } from './patchCreateProgram';

patchCreateProgram(ts);
export = ts;
