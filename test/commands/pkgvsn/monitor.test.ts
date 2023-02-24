import { expect, test } from '@oclif/test';

describe('pkgvsn monitor', () => {
  test
    .stdout()
    .command(['pkgvsn monitor'])
    .it('runs monitor', (ctx) => {
      expect(ctx.stdout).to.contain('');
    });
});
