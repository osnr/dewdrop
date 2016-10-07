const context = require.context('mocha!.', true, /.spec.ts$/);
context.keys().forEach(context);
