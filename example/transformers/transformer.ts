import * as ts from 'typescript';
export default (ctx: ts.TransformationContext, program: ts.Program): ts.Transformer<ts.SourceFile> => {
    return sourceFile => {
        function visitor(node: ts.Node): ts.Node {
            if (ts.isCallExpression(node) && ts.getTextOfNodeFromSourceText(sourceFile.text, node.expression) === 'safely') {
                const target = node.arguments[0];
                if (ts.isPropertyAccessExpression(target)) {
                    return ts.createBinary(target.expression, ts.SyntaxKind.AmpersandAmpersandToken, target);
                }
            }
            return ts.visitEachChild(node, visitor, ctx);
        }
        return ts.visitNode(sourceFile, visitor);
    };
};
