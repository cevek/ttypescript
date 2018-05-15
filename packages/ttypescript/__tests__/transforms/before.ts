import * as ts from 'typescript';
export default function(program: ts.Program) {
    const checker = program.getTypeChecker();
    return (ctx: ts.TransformationContext) => sourceFile => {
        function visitor(node: ts.Node): ts.Node {
            if (
                ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) &&
                node.expression.getText() === 'type' &&
                node.typeArguments &&
                node.typeArguments[0]
            ) {
                const type = checker.getTypeFromTypeNode(node.typeArguments[0]);
                return ts.createLiteral(checker.typeToString(type));
            }
            return ts.visitEachChild(node, visitor, ctx);
        }
        return ts.visitEachChild(sourceFile, visitor, ctx);
    };
}
