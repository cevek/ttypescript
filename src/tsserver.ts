// @ts-ignore
import * as ts from 'typescript/lib/tsserver'
import {patchCreateProgram} from './patchCreateProgram'

patchCreateProgram(ts)

export default ts
