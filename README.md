# Static website tracker

Dumb static website modification tracker. The first time you run it against a website it stores the source. Every next time it runs a diff and reports any changes.

## Running

To run it directly from Typescript:

    npx ts-node index.ts <website url>

To transpile and run from Javascript:

    npx tsc
    node index.js <website url>

## Continuous running

Below is setup for using pm2 to do continuous running.

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
    pm2 start scheduler.js --log-date-format 'YYYY-MM-DD HH:mm:ss.SSS'
    pm2 save

## Proxy

Uses `PAC_PROXY` if it exists (should be a URL to a PAC-script). Secondly uses `HTTPS_PROXY` if it exists. Otherwise uses no proxy.

## License

Released under MIT. See [`LICENSE`](LICENSE) file.
