# Static website tracker

Dumb static website modification tracker. The first time you run it against a website it stores the source. Every next time it runs a diff and reports any changes.

## Running

To run it directly from Typescript:

    npx ts-node index.ts -a <website url>

To transpile and run from Javascript:

    npx tsc
    node index.js -a <website url>

Example output:

    $ node index.js -a http://example.com
    Writing initial /path/to/static-website-tracker/diff/f0e6a6a97042a4f1f1c87f5f7d44315b2d852c2df5c7991cc66241bf7072d1c4 file for http://example.com.
    $ node index.js --urls
    http://example.com
    $ node index.js http://example.com
    No differences detected for http://example.com.
    $ node index.js http://example.com
    -    <title>Example Website</title>

    +    <title>Example Domain</title>

    -    <h1>Example Website</h1>
        <p>This website is for use in illustrative examples in documents. You may use this
        webite in literature without prior coordination or asking for permission.</p>

    +    <h1>Example Domain</h1>
        <p>This domain is for use in illustrative examples in documents. You may use this
        domain in literature without prior coordination or asking for permission.</p>

    Changes detected and rewriting /path/to/static-website-tracker/diff/f0e6a6a97042a4f1f1c87f5f7d44315b2d852c2df5c7991cc66241bf7072d1c4 file for http://example.com.

## Continuous running

Below is setup for using pm2 to do continuous running with email sent on change.

First you need to set proper mail settings in `scheduler.ts`. You need to provide:

-   SMTP host (`smtp.example.com`)
-   SMTP port (`587`)
-   From address (`from@example.com`)
-   To address (`to@example.com`)

Then add some URLs to track:

    npx tsc
    node index.js <website url 1>
    node index.js <website url 2>

Then setup pm2 to do scheduled running:

    node install -g pm2
    pm2 start scheduler.js --name "static-website-tracker" --log-date-format 'YYYY-MM-DD HH:mm:ss.SSS'
    pm2 save

## Proxy

Uses `PAC_PROXY` if it exists (should be a URL to a PAC-script). Secondly uses `HTTPS_PROXY` if it exists. Otherwise uses no proxy.

## License

Released under MIT. See [`LICENSE`](LICENSE) file.
