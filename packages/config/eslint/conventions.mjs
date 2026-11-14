// Sailtech conditional-call/test-name policies, enforced through ESLint's parser.
// Contextual paragraph grouping remains a review requirement, not a padding rule.
const conditionalCallExtraction = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      extract: 'Extract this multiline call into a named boolean before the if statement.',
    },
  },
  create(context) {
    const source = context.sourceCode;

    return {
      IfStatement(node) {
        let condition = node.test;
        if (condition.type === 'UnaryExpression' && condition.operator === '!') {
          condition = condition.argument;
        }
        if (condition.type === 'ChainExpression') {
          condition = condition.expression;
        }
        if (condition.type !== 'CallExpression') {
          return;
        }

        const close = source.getLastToken(condition);
        const open =
          condition.arguments.length > 0
            ? source.getTokenBefore(condition.arguments[0])
            : source.getTokenBefore(close);
        if (open?.value === '(' && open.loc.start.line !== close.loc.end.line) {
          context.report({ node: node.test, messageId: 'extract' });
        }
      },
    };
  },
};

function isTestCall(callee) {
  if (callee.type === 'Identifier') {
    return ['test', 'it'].includes(callee.name);
  }

  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    ['test', 'it'].includes(callee.object.name) &&
    !callee.computed &&
    ['only', 'skip'].includes(callee.property.name)
  );
}

const testNaming = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: { name: 'Name tests "should <outcome> when <condition>".' },
  },
  create(context) {
    if (!/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(context.filename)) {
      return {};
    }

    return {
      CallExpression(node) {
        const title = node.arguments[0];
        if (
          !isTestCall(node.callee) ||
          title?.type !== 'Literal' ||
          typeof title.value !== 'string'
        ) {
          return;
        }
        if (!/^should .+ when .+$/.test(title.value.replace(/\s+/g, ' ').trim())) {
          context.report({ node: title, messageId: 'name' });
        }
      },
    };
  },
};

export const conventionsPlugin = {
  rules: {
    'conditional-call-extraction': conditionalCallExtraction,
    'test-naming': testNaming,
  },
};

export const conventionsRules = {
  curly: ['error', 'all'],
  'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
  'ancora/conditional-call-extraction': 'error',
  'ancora/test-naming': 'error',
};
