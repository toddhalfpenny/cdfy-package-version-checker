import { expect, test } from '@oclif/test';

describe('pkgvsn monitor', () => {
  test
    .stdout()
    .command(['pkgvsn monitor'])
    .it('runs hello', (ctx) => {
      expect(ctx.stdout).to.contain('hello world');
    });

  test
    .stdout()
    .command(['pkgvsn monitor', '--name', 'Astro'])
    .it('runs hello --name Astro', (ctx) => {
      expect(ctx.stdout).to.contain('hello Astro');
    });
});
