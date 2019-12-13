import schedule from 'node-schedule';
import { processDiffForUrls } from './index';
import { sendMail } from './mailer';

console.log(`Starting scheduler from ${process.cwd()} of static-website-tracker`);

schedule.scheduleJob('0 * * * *', function() {
    processDiffForUrls()
        .then(result => {
            for (const diffResult of result) {
                if (diffResult.changed) {
                    sendMail(
                        'smtp.example.com',
                        587,
                        'from@example.com',
                        'to@example.com',
                        `Diff in ${diffResult.url}`,
                        diffResult.message,
                        diffResult.messageHtml,
                    ).catch(reason => console.error(reason));
                }
            }
        })
        .catch(reason => console.error(reason));
});
