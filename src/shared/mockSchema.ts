import ts from 'typescript';

export type MockField = {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    defaultValue?: unknown;
};

const DEFAULT_LIMIT = 12;

export function inferMockSchemaFromSource(source: string, limit = DEFAULT_LIMIT): MockField[] {
    if (!source) {
        return [];
    }

    const schema: MockField[] = [];
    const seenNames = new Set<string>();
    const sourceFile = ts.createSourceFile('component.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const visit = (node: ts.Node) => {
        if (schema.length >= limit) {
            return;
        }

        if (ts.isPropertyDeclaration(node)) {
            const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
            if (decorators?.length) {
                const propertyName = extractPropertyName(node.name);
                if (propertyName && !seenNames.has(propertyName)) {
                    const decoratorArgs = extractPropertyDecoratorArgs(decorators, sourceFile);
                    if (decoratorArgs !== undefined) {
                        const explicitType = node.type?.getText(sourceFile) ?? '';
                        const initializerNode = node.initializer;
                        const initializerText = initializerNode ? initializerNode.getText(sourceFile) : '';
                        const type = resolveTypeFromHints(decoratorArgs, explicitType, initializerText);
                        const defaultValue = initializerNode ? evaluateInitializer(initializerNode) : undefined;
                        schema.push({ name: propertyName, type, defaultValue });
                        seenNames.add(propertyName);
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return schema;
}

function extractPropertyName(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }
    return undefined;
}

function extractPropertyDecoratorArgs(decorators: readonly ts.Decorator[], sourceFile: ts.SourceFile): string | undefined {
    for (const decorator of decorators) {
        const expression = decorator.expression;
        if (ts.isCallExpression(expression)) {
            const decoratorName = getDecoratorIdentifier(expression.expression);
            if (isPropertyDecorator(decoratorName)) {
                return expression.arguments.map((arg) => arg.getText(sourceFile)).join(', ');
            }
        } else {
            const decoratorName = getDecoratorIdentifier(expression);
            if (isPropertyDecorator(decoratorName)) {
                return '';
            }
        }
    }

    return undefined;
}

function isPropertyDecorator(name?: string): boolean {
    if (!name) {
        return false;
    }
    return name.toLowerCase().endsWith('property');
}

function getDecoratorIdentifier(expression: ts.Expression): string | undefined {
    if (ts.isIdentifier(expression)) {
        return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
        return expression.name.text;
    }
    return undefined;
}

function resolveTypeFromHints(decoratorArgs: string, explicitType?: string, initializer?: string): MockField['type'] {
    const normalizedDecorator = decoratorArgs?.toLowerCase() ?? '';
    const normalizedExplicit = explicitType?.toLowerCase() ?? '';

    if (normalizedDecorator.includes('boolean') || normalizedExplicit.includes('boolean')) {
        return 'boolean';
    }

    if (normalizedDecorator.includes('number') || normalizedExplicit.includes('number')) {
        return 'number';
    }

    if (
        normalizedDecorator.includes('array') ||
        normalizedDecorator.includes('object') ||
        normalizedExplicit.includes('array') ||
        normalizedExplicit.includes('object')
    ) {
        return 'object';
    }

    if (initializer) {
        const trimmed = initializer.replace(/[`"']/g, '').trim();
        if (/^(true|false)$/i.test(trimmed)) {
            return 'boolean';
        }
        if (!Number.isNaN(Number(trimmed))) {
            return 'number';
        }
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return 'object';
        }
    }

    return 'string';
}

function evaluateInitializer(node: ts.Expression): unknown {
    if (ts.isParenthesizedExpression(node)) {
        return evaluateInitializer(node.expression);
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return node.text;
    }

    if (ts.isNumericLiteral(node)) {
        const numeric = Number(node.text);
        return Number.isNaN(numeric) ? undefined : numeric;
    }

    switch (node.kind) {
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NullKeyword:
            return null;
    }

    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
        const value = evaluateInitializer(node.operand);
        return typeof value === 'number' ? -value : undefined;
    }

    if (ts.isArrayLiteralExpression(node)) {
        const values: unknown[] = [];
        node.elements.forEach((element) => {
            if (ts.isOmittedExpression(element)) {
                values.push(undefined);
                return;
            }

            if (ts.isSpreadElement(element)) {
                const spreadValue = evaluateInitializer(element.expression);
                if (Array.isArray(spreadValue)) {
                    values.push(...spreadValue);
                }
                return;
            }

            values.push(evaluateInitializer(element));
        });
        return values;
    }

    if (ts.isObjectLiteralExpression(node)) {
        const obj: Record<string, unknown> = {};
        node.properties.forEach((prop) => {
            if (ts.isPropertyAssignment(prop)) {
                const key = extractPropertyName(prop.name);
                if (key) {
                    obj[key] = prop.initializer ? evaluateInitializer(prop.initializer) : undefined;
                }
            }
        });
        return obj;
    }

    return undefined;
}
