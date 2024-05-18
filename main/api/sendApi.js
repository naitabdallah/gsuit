const { google } = require('googleapis');
const csv = require('csv-parser');
const fs = require('fs');
const privateKey = require('./cred.json');
const axios = require('axios');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const logFile = 'email_logs.txt';

// Redirect console output to a file
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const logConsole = new console.Console(logStream);

// Constants for email sending configuration
const QUOTA_LIMIT = 1200000;
const REQUESTS_PER_EMAIL = 300;
const INTERVAL = 60000 / QUOTA_LIMIT;

// Variables to track successful email sending and request count
let successfulEmails = 0;

// Function to generate a random string of given length
const generateRandomString = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const createMimeMessage = (user, to, from, subject, htmlContent) => {

    /* 
    htmlContent = htmlContent.replace('[user]',user)            
    */

    const raw = Buffer.from(
        `Content-Type: text/html; charset="UTF-8"\n` +
        `From: "${from} <${user}>\n` +
        `To: ${to}\n` +
        `Subject: ${subject}\n\n` +
        htmlContent,
        `utf-8`
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');


    return raw;
};

// Function to send email using Google APIs
const sendEmail = async (user, to, from, subject, htmlContent) => {
    const jwtClient = new google.auth.JWT(
        privateKey.client_email, null, privateKey.private_key, ['https://mail.google.com/'], user
    );

    const tokens = await jwtClient.authorize();
    if (!tokens) {
        console.log('Failed to authorize');
        return;
    }

    const raw = createMimeMessage(user, to, from, subject, htmlContent);

    const url = 'https://www.googleapis.com/gmail/v1/users/me/messages/send';
    const headers = { 'Authorization': `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' };
    const data = { raw };

    try {
        await axios.post(url, data, { headers });
        await successfulEmails++;
        await logConsole.log(`User: ${user}, To: ${to}, Message sent: ${successfulEmails}, Date-Time: ${new Date().toLocaleString('en-US', { hour12: false })}`);
        await console.log(successfulEmails)
    } catch (error) {
        console.error('Failed to send email:');
    }
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

// Function to introduce delay for rate limiting
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const sendEmails = async () => {
    const users = await readCsv('../../files/users.csv');
    const data = await readCsv('../../files/data.csv');
    const info = await readCsv('../../files/info.csv');
    const htmlContent = fs.readFileSync('../../files/html.txt', 'utf8').trim();
    const names = await readCsv('../../files/names.csv')
    const { from, subject } = info[0];


    const emailsPerWorker = Math.ceil(data.length / Math.ceil(users.length / 100));

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

const main = async() => {
    // If running as a worker thread, execute the email sending logic
    if (!isMainThread) {
        const { users, data, htmlContent, from, subject } = workerData;
        // Process each user and send emails
        let index = 0;
        for (let user of users) {
            for (let j = 0; j < REQUESTS_PER_EMAIL && index < data.length; j++) {
                const emailData = data[index++];
                console.log(emailData['to'])
                
                // Write the output to the log file
                await sendEmail(user.email, emailData.to, from, subject, htmlContent);
                await sleep(INTERVAL);
            }
        }
        // Close the log file stream
        logStream.end();
        parentPort.postMessage('Done');
    } else {
        sendEmails().catch(console.error);
    }
}

main();