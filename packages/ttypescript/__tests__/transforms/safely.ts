import * as ts from 'typescript';

export interface MyPluginOptions {
    some?: string
}

export default function myTransformerPlugin(program: ts.Program, opts?: MyPluginOptions) {
    return {
        before(ctx: ts.TransformationContext) {
            return (sourceFile: ts.SourceFile) => {
                function visitor(node: ts.Node): ts.Node {
                    if (ts.isCallExpression(node) && node.expression.getText() === 'safely') {
                        const target = node.arguments[0]
                        if (ts.isPropertyAccessExpression(target)) {
                            return ts.factory.createBinaryExpression(
                                target.expression,
                                ts.SyntaxKind.AmpersandAmpersandToken,
                                target
                            )
                        }
                    }
                    return ts.visitEachChild(node, visitor, ctx)
                }
                return ts.visitEachChild(sourceFile, visitor, ctx)
            }
        }
    }
}
