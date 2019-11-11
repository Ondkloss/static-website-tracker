import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent';
import * as Diff from 'diff';

if (process.argv.length != 3) {
    throw new Error('Missing URL argument');
}

const url = process.argv[2];
const hash = crypto.createHash('sha256').update(url).digest('hex');
const basefile = __dirname + path.sep + 'diff' + path.sep + hash;

fetch(url, { agent: new HttpsProxyAgent(process.env.https_proxy ?? '') }).then(value => {
    return value.text();
}).then(value => {
    ensureDirectoryExistence(basefile);
    if (pathExists(basefile)) {
        const base = readFile(basefile);
        const diff = Diff.diffLines(base, value);
        let changes: string[] = [];

        diff.forEach(function (part) {
            if (part.added || part.removed) {
                var color = part.added ? "\x1b[32m" :
                    part.removed ? "\x1b[31m" : "\x1b[0m";
                changes.push(color + part.value);
            }
        });

        if (changes.length > 0) {
            for (const change of changes) {
                console.log(change);
            }
            console.log(`Rewriting ${basefile} file.`);
            writeFile(base, value);
        }
        else {
            console.log('No differences detected.');
        }
    }
    else {
        console.log(`Writing initial ${basefile} file.`);
        writeFile(basefile, value);
    }
}).catch(reason => {
    console.error(reason);
});

function ensureDirectoryExistence(thePath: string) {
    var dirname = path.dirname(thePath);

    if (!fs.existsSync(dirname)) {
        console.log('Creating diff directory.');
        ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }
}

function pathExists(thePath: string): boolean {
    return fs.existsSync(thePath);
}

function writeFile(filename: string, value: string) {
    fs.writeFileSync(filename, value, {
        encoding: 'utf-8'
    });
}

function readFile(filename: string): string {
    return fs.readFileSync(filename, {
        encoding: 'utf-8'
    });
}
