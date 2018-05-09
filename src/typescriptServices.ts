// @ts-ignore
import * as tsSrv from 'typescript/lib/typescriptServices'
import {patchCreateProgram} from './patchCreateProgram'

patchCreateProgram(tsSrv)

export default tsSrv
