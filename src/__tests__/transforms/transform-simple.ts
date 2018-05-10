import * as ts from 'typescript'

export function simpleTransformer(ctx: ts.TransformationContext) {
    return (sourceFile: ts.SourceFile) => {
        return sourceFile
    } 
}

export default function transform1(program: ts.Program) {
    return simpleTransformer
}
