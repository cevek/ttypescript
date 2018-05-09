import * as ts from 'typescript/lib/typescript'
import {patchCreateProgram} from './patchCreateProgram'

export = patchCreateProgram(ts)
