import * as ts from 'typescript';
export default (ctx: ts.TransformationContext, program: ts.Program): ts.Transformer<ts.SourceFile> => {
    return sourceFile => {
        function visitor(node: ts.Node): ts.Node {
            if (ts.isCallExpression(node) && getText(node.expression) === 'safely') {
                const target = node.arguments[0];
                if (ts.isPropertyAccessExpression(target)) {
                    return ts.createBinary(target.expression, ts.SyntaxKind.AmpersandAmpersandToken, target);
                }
            }
            return ts.visitEachChild(node, visitor, ctx);
        }
        return ts.visitEachChild(sourceFile, visitor, ctx);
        
        function getText(node: ts.Node) {
            return sourceFile.text.substring(node.getStart(), node.getEnd());
        }
    };
};
