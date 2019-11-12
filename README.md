# Static website tracker

Dumb static website modification tracker. The first time you run it against a website it stores the source. Every next time it runs a diff and reports any changes.

## Running

To run it directly from Typescript:

    npx ts-node index.ts <website url>

To transpile and run from Javascript:

    npx tsc
    node index.js <website url>

## License

Released under MIT. See [`LICENSE`](LICENSE) file.
