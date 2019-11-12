import nodemailer, { SentMessageInfo } from 'nodemailer';
import './index';

async function sendDiffEmail(host: string, port: number): Promise<SentMessageInfo> {
    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: false,
    });

    const info = await transporter.sendMail({
        from: '"Bob Smith" <bob@example.com>',
        to: 'alice@example.com',
        subject: 'Hello world?',
        text: 'Hello world?',
        html: '<b>Hello world?</b>',
    });

    return info;
}

sendDiffEmail('smtp.example.com', 587)
    .then(result => {
        console.log(result);
    })
    .catch(reason => {
        console.log(reason);
    });
