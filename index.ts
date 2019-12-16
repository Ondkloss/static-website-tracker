import crypto from 'crypto';
import { Agent } from 'https';
import { sep, dirname } from 'path';
import { appendFileSync, existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { AllHtmlEntities } from 'html-entities';
import fetch from 'node-fetch';
import { ArgumentParser } from 'argparse';
import HttpsProxyAgent from 'https-proxy-agent';
// @ts-ignore
import PacProxyAgent from 'pac-proxy-agent';
import * as Diff from 'diff';

const DIFF_DIR = __dirname + sep + 'diff';
const DIFF_URLS_FILE = DIFF_DIR + sep + '.urls';

interface Arguments {
    add?: string;
    remove?: string;
    clean: boolean;
    run: boolean;
    urls: boolean;
}

class DiffResult {
    url: string;
    created: boolean;
    changed: boolean;
    diff?: Diff.Change[];
    message?: string;
    messageHtml?: string;

    constructor(
        url: string,
        created: boolean,
        changed: boolean,
        message?: string,
        messageHtml?: string,
        diff: Diff.Change[] | undefined = undefined,
    ) {
        this.url = url;
        this.created = created;
        this.changed = changed;
        this.message = message;
        this.messageHtml = messageHtml;
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

function hasChanges(diff: Diff.Change[]): boolean {
    return diff.some(change => change.added || change.removed);
}

function textify(diff: Diff.Change[]): string {
    const changes: string[] = [];

    diff.forEach(function(part) {
        if (part.added || part.removed) {
            const color = part.added ? '+' : part.removed ? '-' : '';
            changes.push(color + part.value);
        }
    });

    return changes.join('\n');
}

function htmlify(diff: Diff.Change[]): string {
    const changes: string[] = [];

    diff.forEach(function(part) {
        const entities = new AllHtmlEntities();
        if (part.added) {
            changes.push(
                '<font color="green">+' +
                    entities
                        .encode(part.value)
                        .replace(/\r\n/g, '<br/>')
                        .replace(/\n/g, '<br/>') +
                    '</font>',
            );
        } else if (part.removed) {
            changes.push(
                '<font color="red">-' +
                    entities
                        .encode(part.value)
                        .replace(/\r\n/g, '<br/>')
                        .replace(/\n/g, '<br/>') +
                    '</font>',
            );
        }
    });

    return changes.join('<br/>');
}

function selectProxyAgent(): Agent | undefined {
    if (process.env.pac_proxy) {
        return PacProxyAgent(process.env.pac_proxy);
    } else if (process.env.https_proxy) {
        return new HttpsProxyAgent(process.env.https_proxy);
    }

    return undefined;
}

export function getDiffUrls(): string[] {
    const urls: string[] = readFileSync(DIFF_URLS_FILE, {
        encoding: 'utf-8',
    }).split('\n');

    return urls;
}

export function removeUrl(value: string): void {
    const urls: string[] = getDiffUrls();
    const result: string[] = [];

    for (const url of urls) {
        if (url !== value) {
            result.push(url);
        }
    }

    writeFile(DIFF_URLS_FILE, result.join('\n'));
    const basefile = DIFF_DIR + sep + filenameify(value);
    if (existsSync(basefile)) {
        unlinkSync(basefile);
    }
}

export function cleanDiffDir(): void {
    const urls: string[] = getDiffUrls();
    const files: string[] = readdirSync(DIFF_DIR);

    for (const file of files) {
        if (file !== '.urls' && !urls.some(url => filenameify(url) === file)) {
            unlinkSync(DIFF_DIR + sep + file);
        }
    }
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

        if (hasChanges(diff)) {
            console.log(textify(diff));
            console.log(`Changes detected and rewriting ${basefile} file for ${url}.`);
            writeFile(basefile, text);
            return new DiffResult(url, false, true, textify(diff), htmlify(diff), diff);
        } else {
            console.log(`No differences detected for ${url}.`);
            return new DiffResult(url, false, false, `No differences detected for ${url}.`, undefined, diff);
        }
    } else {
        console.log(`Writing initial ${basefile} file for ${url}.`);
        writeFile(basefile, text);
        appendFile(DIFF_URLS_FILE, url + '\n');
        return new DiffResult(url, true, false, `Writing initial ${basefile} file for ${url}.`);
    }
}

export async function processDiffForUrls(): Promise<DiffResult[]> {
    const urls = getDiffUrls();
    const result: DiffResult[] = [];

    for (const url of urls) {
        const part = await processDiffForUrl(url);
        result.push(part);
    }

    return result;
}

function argparser(): Arguments {
    const parser = new ArgumentParser({
        version: '1.0.0',
        addHelp: true,
        description: 'Dumb static website modification tracker',
    });

    const group = parser.addMutuallyExclusiveGroup();

    group.addArgument(['-a', '--add'], {
        help: 'Add (or diff an existing) a URL',
    });
    group.addArgument(['-r', '--remove'], {
        help: 'Remove a URL',
    });
    group.addArgument('--run', {
        action: 'storeTrue',
        help: 'Diff all existing URLs',
    });
    group.addArgument('--urls', {
        action: 'storeTrue',
        help: 'List URLs',
    });
    group.addArgument('--clean', {
        action: 'storeTrue',
        help: '==SUPPRESS==',
    });
    return parser.parseArgs();
}

function main(): void {
    const args = argparser();

    if (args.add) {
        processDiffForUrl(args.add).catch(reason => console.log(reason));
    } else if (args.remove) {
        removeUrl(args.remove);
    } else if (args.run) {
        processDiffForUrls();
    } else if (args.urls) {
        for (const url of getDiffUrls()) {
            console.log(url);
        }
    } else if (args.clean) {
        cleanDiffDir();
    }
}

if (require.main === module) {
    main();
}
