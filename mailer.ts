import nodemailer, { SentMessageInfo } from 'nodemailer';
import './index';

export async function sendMail(
    host: string,
    port: number,
    from: string,
    to: string,
    subject: string,
    text: string | undefined,
    html: string | undefined = undefined,
    ignoreTLS = false,
): Promise<SentMessageInfo> {
    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: false,
        ignoreTLS,
    });

    const info = await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
    });

    return info;
}
