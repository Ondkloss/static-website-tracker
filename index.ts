import crypto from 'crypto';
import { Agent } from 'https';
import { sep, dirname } from 'path';
import { appendFileSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import fetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent';
// @ts-ignore
import PacProxyAgent from 'pac-proxy-agent';
import * as Diff from 'diff';

const DIFF_DIR = __dirname + sep + 'diff';
const DIFF_URLS_FILE = DIFF_DIR + sep + '.urls';

class DiffResult {
    url: string;
    created: boolean;
    changed: boolean;
    diff?: Diff.Change[];
    message?: string;

    constructor(
        url: string,
        created: boolean,
        changed: boolean,
        message?: string,
        diff: Diff.Change[] | undefined = undefined,
    ) {
        this.url = url;
        this.created = created;
        this.changed = changed;
        this.message = message;
        this.diff = diff;
    }
}

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

function appendFile(filename: string, value: string): void {
    appendFileSync(filename, value, {
        encoding: 'utf-8',
    });
}

function readFile(filename: string): string {
    return readFileSync(filename, {
        encoding: 'utf-8',
    });
}

function filenameify(url: string): string {
    return crypto
        .createHash('sha256')
        .update(url)
        .digest('hex');
}

function selectProxyAgent(): Agent {
    if (process.env.pac_proxy) {
        return PacProxyAgent(process.env.pac_proxy);
    }

    return new HttpsProxyAgent(process.env.https_proxy ?? '');
}

export function getUrlsInDiffDir(): string[] {
    const files: string[] = readdirSync(DIFF_DIR);

    const urls: string[] = readFileSync(DIFF_URLS_FILE, {
        encoding: 'utf-8',
    }).split('\n');

    const result: string[] = [];

    for (const url of urls) {
        if (files.includes(filenameify(url))) {
            result.push(url);
        }
    }

    return result;
}

export async function processDiffForUrl(url: string): Promise<DiffResult> {
    const hex = filenameify(url);
    const basefile = DIFF_DIR + sep + hex;

    const fetched = await fetch(url, { agent: selectProxyAgent() });
    const text = await fetched.text();

    ensureDirectoryExistence(basefile);
    if (pathExists(basefile)) {
        const base = readFile(basefile);
        const diff = Diff.diffLines(base, text);
        const changes: string[] = [];

        diff.forEach(function(part) {
            if (part.added || part.removed) {
                const color = part.added ? '+' : part.removed ? '-' : '';
                changes.push(color + part.value);
            }
        });

        if (changes.length > 0) {
            for (const change of changes) {
                console.log(change);
            }
            console.log(`Changes detected and rewriting ${basefile} file for ${url}.`);
            writeFile(basefile, text);
            return new DiffResult(url, false, true, changes.join('\n'), diff);
        } else {
            console.log(`No differences detected for ${url}.`);
            return new DiffResult(url, false, false, `No differences detected for ${url}.`, diff);
        }
    } else {
        console.log(`Writing initial ${basefile} file for ${url}.`);
        writeFile(basefile, text);
        appendFile(DIFF_URLS_FILE, url + '\n');
        return new DiffResult(url, true, false, `Writing initial ${basefile} file for ${url}.`);
    }
}

export async function processDiffForUrls(): Promise<DiffResult[]> {
    const urls = getUrlsInDiffDir();
    const result: DiffResult[] = [];

    for (const url of urls) {
        const part = await processDiffForUrl(url);
        result.push(part);
    }

    return result;
}

function main(): void {
    if (process.argv.length != 3) {
        throw new Error('Missing argument');
    }

    if (process.argv[2] == '--urls') {
        for (const url of getUrlsInDiffDir()) {
            console.log(url);
        }
    } else {
        processDiffForUrl(process.argv[2]).catch(reason => console.log(reason));
    }
}

if (require.main === module) {
    main();
}
