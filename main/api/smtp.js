const csv = require('csv-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const logFile = 'smtp_email_logs.txt';


const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const logConsole = new console.Console(logStream);

// Constants for email sending configuration
const QUOTA_LIMIT = 1200000;
const REQUESTS_PER_EMAIL = 20;
const INTERVAL = 60000 / QUOTA_LIMIT;

// Variables to track successful email sending and request count
let successfulEmails = 0;

const generateRandomString = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Function to read CSV file and parse its contents
const readCsv = async (filePath) => {
    const items = [];
    await new Promise(resolve => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                items.push(row);
            })
            .on('end', () => {
                console.log(`${filePath} successfully processed, ${items.length} items`);
                resolve(items);
            });
    });
    return items;
};


// Function to send email using SMTP
const sendEmail = async (user, to, from, subject, htmlContent) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: user,
            pass: 'Password123@',
        },
    });

    htmlContent = htmlContent.replace('[to]',generateRandomString(1000));
    to_ = to.split('@')[0];
    htmlContent = htmlContent.replace('[to]',to_);

    try {
        await transporter.sendMail({
            from: `"${from}" <${user}>`,
            to:to,
            subject:subject,
            html: htmlContent,
        });
        successfulEmails++;
        logConsole.log(`User: ${user}, To: ${to}, Message sent: ${successfulEmails}, Date-Time: ${new Date().toLocaleString('en-US', { hour12: false })}`);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
};


// Function to introduce delay for rate limiting
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const sendEmails = async () => {
    const users = await readCsv('../../files/users.csv');
    const data = await readCsv('../../files/data.csv');
    const info = await readCsv('../../files/info.csv');
    const htmlContent = fs.readFileSync('../../files/html.txt', 'utf8').trim();
    const { from, subject } = info[0];

    const emailsPerWorker = Math.ceil(data.length / Math.ceil(users.length / 50));

    const workerPromises = [];
    for (let i = 0, dataIndex = 0; dataIndex < data.length; i++, dataIndex += emailsPerWorker) {
        const usersBatch = users.slice(i * 100, (i + 1) * 100);
        const dataSlice = data.slice(dataIndex, dataIndex + emailsPerWorker);
        const workerData = {
            users: usersBatch,
            data: dataSlice,
            htmlContent,
            from,
            subject,
        };
        const workerPromise = createWorker(workerData);
        workerPromises.push(workerPromise);
    }
    // Wait for all worker threads to complete
    await Promise.all(workerPromises);
    console.log('All emails sent successfully.');
};

const createWorker = (workerData) => new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
});

const main = async () => {
    // If running as a worker thread, execute the email sending logic
    if (!isMainThread) {
        const { users, data, htmlContent, from, subject } = workerData;
        // Process each user and send emails
        let index = 0;
        for (let user of users) {
            for (let j = 0; j < REQUESTS_PER_EMAIL && index < data.length; j++) {
                const emailData = data[index++];
                // Write the output to the log file
                await sendEmail(user.email, emailData.to, from, subject, htmlContent);
                await sleep(INTERVAL);
            }
        }
        // Close the log file stream
        parentPort.postMessage('Done');
    } else {
        sendEmails().catch(console.error);
    }
}

main();
