import * as child from 'child_process';
import * as path from 'path';
import * as util from 'util';
import * as notifier from 'node-notifier';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('cdfy-package-version-checker', 'pkgvsn.monitor', [
  'summary',
  'description',
  'examples',
  'flags.timeout.summary',
]);

const setTimeoutPromise = util.promisify(setTimeout);
const exec = util.promisify(child.exec);

const secondsBetweenRuns = 30;

interface creationStatus {
  Id?: string;
  Status?: string;
  err?: string | number;
  Package2Id?: string;
  Package2VersionId?: string;
  SubscriberPackageVersionId?: string;
  Tag?: string;
  Branch?: string;
  Error?: string | unknown[];
  CreatedDate?: '2020-04-22 11:15';
}

interface expectedCmdResp {
  status: number;
  result?: creationStatus[];
}
export type PkgvsnMonitorResult = {
  path: string;
};

export default class PkgvsnMonitor extends SfCommand<creationStatus> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    timeout: Flags.integer({
      char: 't',
      default: 1200,
      summary: messages.getMessage('flags.timeout.summary'),
    }),
  };

  public async run(): Promise<creationStatus> {
    const { flags } = await this.parse(PkgvsnMonitor);
    const maxRuns = Math.floor(flags.timeout / secondsBetweenRuns);
    const res: creationStatus | void = await this.getLatestStatus(1, maxRuns).catch((err: creationStatus) => {
      this.spinner.stop();
      this.createNotification(err);
    });
    this.spinner.stop();
    this.createNotification(res as creationStatus);
    return res as creationStatus;
  }

  private async getLatestStatus(curRun: number, maxRuns: number, prevStatus = ''): Promise<creationStatus> {
    if (curRun === 1) {
      this.spinner.start('Initialising');
    }

    const cmdRes = await exec('sf package:version:create:list --json');
    if (cmdRes.stdout) {
      const resJson: expectedCmdResp = JSON.parse(cmdRes.stdout) as expectedCmdResp;
      if (resJson.status === 0) {
        const lastCreationRes = resJson.result[0];
        switch (lastCreationRes.Status) {
          case 'Success':
            this.log(
              lastCreationRes.Status + ' - SubscriberPackageVersionId: ' + lastCreationRes.SubscriberPackageVersionId
            );
            return lastCreationRes;
          case 'Error':
            this.warn(lastCreationRes.Status + ' - Id: ' + lastCreationRes.Id);
            return lastCreationRes;
          default:
            this.spinner.start(lastCreationRes.Status);
            if (lastCreationRes.Status !== prevStatus) {
              this.log(lastCreationRes.Status + ' - Id: ' + lastCreationRes.Id);
            }
            if (curRun > maxRuns) {
              this.spinner.stop(lastCreationRes.Status);
              return {};
            } else {
              await setTimeoutPromise(secondsBetweenRuns * 1000);
              curRun++;
              return this.getLatestStatus(curRun, maxRuns, lastCreationRes.Status);
            }
        }
      } else {
        this.error(resJson.status.toString(), { exit: false });
        return { err: resJson.status };
      }
    } else {
      this.error(cmdRes.stderr, { exit: false });
      return { err: cmdRes.stderr };
    }
  }

  private createNotification(res: creationStatus): void {
    this.log('Result:', res);
    const iconPath = path.join(__dirname, '../../../assets/package.png');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    notifier.notify({
      title: 'Latest Packaging Version Creation Complete',
      subtitle: res.Status,
      message: res.SubscriberPackageVersionId
        ? res.Status + '! \nSubscriberPackageVersionId: ' + res.SubscriberPackageVersionId
        : res.Status,
      icon: iconPath,
      sound: true,
      timeout: 30,
    });
  }
}
