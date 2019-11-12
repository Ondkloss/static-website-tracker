import crypto from 'crypto';
import { sep, dirname } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import fetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent';
import * as Diff from 'diff';

function ensureDirectoryExistence(thePath: string): void {
    const directoryName = dirname(thePath);

    if (!existsSync(directoryName)) {
        console.log('Creating diff directory.');
        ensureDirectoryExistence(directoryName);
        mkdirSync(directoryName);
    }
}

function pathExists(thePath: string): boolean {
    return existsSync(thePath);
}

function writeFile(filename: string, value: string): void {
    writeFileSync(filename, value, {
        encoding: 'utf-8',
    });
}

function readFile(filename: string): string {
    return readFileSync(filename, {
        encoding: 'utf-8',
    });
}

function main(): void {
    if (process.argv.length != 3) {
        throw new Error('Missing URL argument');
    }

    const url = process.argv[2];
    const hash = crypto
        .createHash('sha256')
        .update(url)
        .digest('hex');
    const basefile = __dirname + sep + 'diff' + sep + hash;

    fetch(url, { agent: new HttpsProxyAgent(process.env.https_proxy ?? '') })
        .then(value => {
            return value.text();
        })
        .then(value => {
            ensureDirectoryExistence(basefile);
            if (pathExists(basefile)) {
                const base = readFile(basefile);
                const diff = Diff.diffLines(base, value);
                const changes: string[] = [];

                diff.forEach(function(part) {
                    if (part.added || part.removed) {
                        const color = part.added ? '\x1b[32m' : part.removed ? '\x1b[31m' : '\x1b[0m';
                        changes.push(color + part.value);
                    }
                });

                if (changes.length > 0) {
                    for (const change of changes) {
                        console.log(change + '\x1b[0m');
                    }
                    console.log(`Rewriting ${basefile} file.`);
                    writeFile(basefile, value);
                } else {
                    console.log('No differences detected.');
                }
            } else {
                console.log(`Writing initial ${basefile} file.`);
                writeFile(basefile, value);
            }
        })
        .catch(reason => {
            console.error(reason);
        });
}

if (require.main === module) {
    main();
}
